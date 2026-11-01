import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Entry {
  id: string;
  user_id: string;
  social_username: string | null;
  missions_completed: string[];
  status: string;
}

function getTierMultiplier(missionsCount: number, totalMissions: number): number {
  const pct = totalMissions > 0 ? (missionsCount / totalMissions) * 100 : 0;
  if (pct >= 100) return 3;
  if (pct >= 75) return 2;
  if (pct >= 50) return 1.5;
  return 1;
}

function cryptoRandom(): number {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return bytes[0] / 4294967296;
}

function weightedRandomPick(entries: Entry[], totalMissions: number): Entry {
  const weights = entries.map(e => ({
    entry: e,
    weight: getTierMultiplier((e.missions_completed || []).length, totalMissions),
  }));
  const totalWeight = weights.reduce((a, w) => a + w.weight, 0);
  let r = cryptoRandom() * totalWeight;
  for (const w of weights) {
    r -= w.weight;
    if (r <= 0) return w.entry;
  }
  return weights[weights.length - 1].entry;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const { raffle_id } = await req.json();
    if (!raffle_id) {
      return new Response(JSON.stringify({ error: "raffle_id required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: raffle } = await supabase.from("raffles").select("*").eq("id", raffle_id).single();
    if (!raffle) {
      return new Response(JSON.stringify({ error: "Raffle not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (raffle.business_user_id !== user.id) {
      const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: user.id, _role: "admin" });
      if (!isAdmin) {
        return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    // Get approved entries
    const { data: entries } = await supabase
      .from("social_raffle_entries")
      .select("*")
      .eq("raffle_id", raffle_id)
      .eq("status", "approved");

    if (!entries || entries.length === 0) {
      return new Response(JSON.stringify({ error: "No approved participants" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const totalMissions = (raffle.social_actions || []).length;
    const winner = weightedRandomPick(entries as unknown as Entry[], totalMissions);
    const timestamp = new Date().toISOString();

    // Update raffle status
    await supabase.from("raffles").update({ status: "completed" }).eq("id", raffle_id);

    // Award luck points to winner
    await supabase.from("luck_points").insert({
      user_id: winner.user_id,
      action: "social_raffle_win",
      points: 500,
      description: `Vencedor do sorteio social: ${raffle.title}`,
      raffle_id: raffle_id,
    });

    // Notify winner
    await supabase.from("notifications").insert({
      user_id: winner.user_id,
      title: "🏆 Parabéns, Ganhaste!",
      message: `Foste seleccionado como vencedor do sorteio "${raffle.title}"! O criador do sorteio entrará em contacto.`,
      type: "winner",
      raffle_id: raffle_id,
      metadata: { social_username: winner.social_username },
    });

    // ── Auditoria honesta: SHA-256 real dos dados do sorteio (sem teatro de blockchain) ──
    const seedData = {
      raffle_id,
      raffle_title: raffle.title,
      total_participants: entries.length,
      winner_entry_id: winner.id,
      winner_user_id: winner.user_id,
      winner_social_username: winner.social_username,
      missions_count: (winner.missions_completed || []).length,
      total_missions: totalMissions,
      draw_timestamp: timestamp,
      algorithm: "weighted_crypto_random",
      weights: entries.map(e => ({
        entry_id: e.id,
        missions: ((e as unknown as Entry).missions_completed || []).length,
        multiplier: getTierMultiplier(((e as unknown as Entry).missions_completed || []).length, totalMissions),
      })),
    };
    const auditHash = await sha256Hex(JSON.stringify(seedData));

    await supabase.from("blockchain_verifications").insert({
      raffle_id,
      tx_hash: auditHash,
      block_number: null,
      network: "bateu-sha256",
      winner_ticket_number: 1, // Social raffles use entry-based, not ticket-based
      seed_data: seedData,
    });

    const tierMultiplier = getTierMultiplier((winner.missions_completed || []).length, totalMissions);
    const tierName = tierMultiplier >= 3 ? "Lenda" : tierMultiplier >= 2 ? "Super Fã" : tierMultiplier >= 1.5 ? "Engajado" : "Iniciante";

    return new Response(JSON.stringify({
      success: true,
      winner: {
        entry_id: winner.id,
        user_id: winner.user_id,
        social_username: winner.social_username,
        missions_completed: (winner.missions_completed || []).length,
        tier: tierName,
        multiplier: tierMultiplier,
      },
      total_participants: entries.length,
      raffle_title: raffle.title,
      verification: {
        method: "sha256_auditoria",
        hash: auditHash,
        algorithm: "weighted_crypto_random",
        verified_at: timestamp,
      },
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
