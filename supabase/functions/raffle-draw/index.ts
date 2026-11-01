import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ═══════════════════════════════════════════════════════════════════════
// REA SORTEIOS — raffle-draw (commit-reveal provably fair)
//   phase=commit: publica SHA-256(server_seed) ANTES do sorteio
//   phase=reveal: revela server_seed + calcula vencedor com
//                 HMAC-SHA256(server_seed, "client_seed:nonce") mod N
// Autorização: admin/superadmin OU dono do sorteio (business_user_id).
// ═══════════════════════════════════════════════════════════════════════

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

async function isStaff(supabaseAdmin: any, userId: string): Promise<boolean> {
  const { data: sa } = await supabaseAdmin.rpc("is_superadmin", { _user_id: userId });
  if (sa) return true;
  const { data: ad } = await supabaseAdmin.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(ad);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceKey);

    // ── Autenticação
    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) {
      return new Response(JSON.stringify({ error: "Sessão necessária" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data: { user }, error: userErr } = await anon.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const raffleId: string = body.raffle_id;
    const phase: "commit" | "reveal" = body.phase === "commit" ? "commit" : "reveal";
    if (!raffleId) {
      return new Response(JSON.stringify({ error: "raffle_id obrigatório" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Autorização: staff OU dono do sorteio
    const staff = await isStaff(supabaseAdmin, user.id);
    const { data: raffle } = await supabaseAdmin.from("raffles").select("id, title, business_user_id, status").eq("id", raffleId).single();
    if (!raffle) {
      return new Response(JSON.stringify({ error: "Sorteio não encontrado" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (!staff && raffle.business_user_id !== user.id) {
      return new Response(JSON.stringify({ error: "Sem permissão para sortear este sorteio" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ── Participantes elegíveis
    const { data: participants } = await supabaseAdmin
      .from("participants")
      .select("id, ticket_number, user_id")
      .eq("raffle_id", raffleId)
      .eq("status", "active")
      .order("ticket_number", { ascending: true });
    if (!participants || participants.length === 0) {
      return new Response(JSON.stringify({ error: "Sem participantes elegíveis" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══ FASE 1 — COMMIT: publica o compromisso antes de qualquer sorteio
    if (phase === "commit") {
      const { data: existing } = await supabaseAdmin
        .from("raffle_draw_commits")
        .select("id, server_seed_hash, client_seed, nonce, status, committed_at")
        .eq("raffle_id", raffleId)
        .order("nonce", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (existing && existing.status === "committed") {
        return new Response(JSON.stringify({ ok: true, commit: existing, reused: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const serverSeed = randomSeedHex();
      const serverSeedHash = await sha256Hex(serverSeed);
      const clientSeed = `bateu:${raffleId}`;
      const nonce = existing ? existing.nonce + 1 : 0;
      // O seed em claro fica numa tabela privada (só service_role); o hash
      // público entra no compromisso. O seed só é revelado no phase=reveal.
      const { error: seedErr } = await supabaseAdmin
        .from("raffle_draw_seeds")
        .insert({ commit_hash: serverSeedHash, server_seed: serverSeed });
      if (seedErr) throw seedErr;
      const { data: commit, error: commitErr } = await supabaseAdmin
        .from("raffle_draw_commits")
        .insert({ raffle_id: raffleId, server_seed_hash: serverSeedHash, client_seed: clientSeed, nonce, status: "committed" })
        .select()
        .single();
      if (commitErr) throw commitErr;
      return new Response(JSON.stringify({ ok: true, commit }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // ══ FASE 2 — REVEAL: revela o seed e apura o vencedor
    const { data: commit } = await supabaseAdmin
      .from("raffle_draw_commits")
      .select("*")
      .eq("raffle_id", raffleId)
      .eq("status", "committed")
      .order("nonce", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!commit) {
      return new Response(JSON.stringify({ error: "Sem compromisso aberto — chama phase=commit primeiro" }), { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: seedRow } = await supabaseAdmin
      .from("raffle_draw_seeds")
      .select("server_seed")
      .eq("commit_hash", commit.server_seed_hash)
      .maybeSingle();
    if (!seedRow?.server_seed) {
      return new Response(JSON.stringify({ error: "Semente comprometida não encontrada" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const serverSeed: string = seedRow.server_seed;

    // Prova de integridade: o seed revelado TEM de corresponder ao hash comprometido
    const checkHash = await sha256Hex(serverSeed);
    if (checkHash !== commit.server_seed_hash) {
      return new Response(JSON.stringify({ error: "Integridade falhou: seed não corresponde ao compromisso" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const hmac = await hmacSha256Hex(serverSeed, `${commit.client_seed}:${commit.nonce}`);
    const value = BigInt("0x" + hmac.slice(0, 13)); // 52 bits — seguro e uniforme
    const drawIndex = Number(value % BigInt(participants.length));
    const winner = participants[drawIndex];

    // ── Registar resultado
    const formula = `index = BigInt("0x" + HMAC-SHA256(server_seed, "${commit.client_seed}:${commit.nonce}").slice(0, 13)) mod ${participants.length}`;
    const { error: resErr } = await supabaseAdmin.from("raffle_draw_results").insert({
      commit_id: commit.id,
      raffle_id: raffleId,
      server_seed: serverSeed,
      winner_participant_id: winner.id,
      winner_ticket: winner.ticket_number,
      winner_user_id: winner.user_id,
      participants_count: participants.length,
      draw_index: drawIndex,
      formula,
    });
    if (resErr) throw resErr;
    await supabaseAdmin.from("raffle_draw_commits").update({ status: "revealed", revealed_at: new Date().toISOString() }).eq("id", commit.id);

    // ── Coroar vencedor + completar sorteio
    await supabaseAdmin.from("participants").update({ status: "winner" }).eq("id", winner.id);
    await supabaseAdmin.from("raffles").update({ status: "completed" }).eq("id", raffleId);
    await supabaseAdmin.from("luck_points").insert({
      user_id: winner.user_id,
      points: 500,
      action: "bonus",
      description: `Vencedor do sorteio (provably fair): ${raffle.title}`,
      raffle_id: raffleId,
    });

    return new Response(JSON.stringify({
      ok: true,
      winner: { id: winner.id, ticket_number: winner.ticket_number, user_id: winner.user_id },
      draw_index: drawIndex,
      server_seed: serverSeed,
      server_seed_hash: commit.server_seed_hash,
      client_seed: commit.client_seed,
      nonce: commit.nonce,
      participants_count: participants.length,
      formula,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err?.message ?? "Erro inesperado" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
