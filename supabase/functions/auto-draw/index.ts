import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function randomSeedHex(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Verify JWT and check if user is admin or superadmin
async function isAuthorized(req: Request): Promise<boolean> {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return false;
  }

  const token = authHeader.slice(7);
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (serviceKey && token === serviceKey) {
    return true;
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  
  // Verify token
  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
  
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return false;
  }
  
  // Check if user is superadmin or admin using is_superadmin function
  const adminSupabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data: isSuperAdmin, error: funcError } = await adminSupabase.rpc("is_superadmin", { _user_id: user.id });
  
  if (funcError) {
    return false;
  }
  
  // Also check if user is an admin
  const { data: isAdmin } = await adminSupabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
  
  return Boolean(isSuperAdmin || isAdmin);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    // Check authorization first
    const authorized = await isAuthorized(req);
    if (!authorized) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 1. Find raffles where auto_draw_scheduled_at has passed and status is still active
    const now = new Date().toISOString();
    const { data: raffles, error: fetchErr } = await supabase
      .from("raffles")
      .select("id, title, max_winners")
      .eq("status", "active")
      .eq("draw_mode", "auto_sold_out")
      .not("auto_draw_scheduled_at", "is", null)
      .lte("auto_draw_scheduled_at", now);

    if (fetchErr) throw fetchErr;
    if (!raffles || raffles.length === 0) {
      return new Response(JSON.stringify({ message: "No raffles to draw", count: 0 }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results = [];
    for (const raffle of raffles) {
      const { data: participants } = await supabase
        .from("participants")
        .select("id, ticket_number, user_id")
        .eq("raffle_id", raffle.id)
        .eq("status", "active")
        .order("ticket_number", { ascending: true });

      if (!participants || participants.length === 0) {
        results.push({ raffle_id: raffle.id, status: "no_participants" });
        continue;
      }

      // REA provably-fair: commit do seed → apuramento HMAC-SHA256 server-side
      const serverSeed = randomSeedHex();
      const serverSeedHash = await sha256Hex(serverSeed);
      const clientSeed = `bateu:${raffle.id}`;
      const nonce = 0;
      await supabase.from("raffle_draw_seeds").insert({ commit_hash: serverSeedHash, server_seed: serverSeed });
      const { data: commit, error: commitErr } = await supabase
        .from("raffle_draw_commits")
        .insert({ raffle_id: raffle.id, server_seed_hash: serverSeedHash, client_seed: clientSeed, nonce, status: "committed" })
        .select()
        .single();
      if (commitErr) { results.push({ raffle_id: raffle.id, status: "commit_failed", error: commitErr.message }); continue; }

      const numWinners = Math.min(raffle.max_winners || 1, participants.length);
      const pool = [...participants];
      const winners = [];

      for (let i = 0; i < numWinners; i++) {
        const hmac = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}:${i}`);
        const value = BigInt("0x" + hmac.slice(0, 13));
        const idx = Number(value % BigInt(pool.length));
        winners.push({ participant: pool.splice(idx, 1)[0], draw_index: idx, nonce: i });
      }

      for (const w of winners) {
        await supabase.from("participants").update({ status: "winner" }).eq("id", w.participant.id);
        await supabase.from("raffle_draw_results").insert({
          commit_id: commit.id,
          raffle_id: raffle.id,
          server_seed: serverSeed,
          winner_participant_id: w.participant.id,
          winner_ticket: w.participant.ticket_number,
          winner_user_id: w.participant.user_id,
          participants_count: participants.length,
          draw_index: w.draw_index,
          formula: `index = BigInt("0x" + HMAC-SHA256(server_seed, "${clientSeed}:${nonce}:${w.nonce}").slice(0, 13)) mod ${participants.length}`,
        });
        await supabase.from("luck_points").insert({
          user_id: w.participant.user_id,
          points: 500,
          action: "bonus",
          description: `Vencedor do sorteio automático (provably fair): ${raffle.title}`,
          raffle_id: raffle.id,
        });
      }
      await supabase.from("raffle_draw_commits").update({ status: "revealed", revealed_at: new Date().toISOString() }).eq("id", commit.id);

      await supabase.from("raffles").update({ status: "completed" }).eq("id", raffle.id);
      results.push({ raffle_id: raffle.id, winners: winners.map(w => w.participant.ticket_number), status: "drawn", method: "hmac_sha256_commit_reveal" });
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
