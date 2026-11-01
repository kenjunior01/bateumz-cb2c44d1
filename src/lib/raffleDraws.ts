import { supabase } from "@/integrations/supabase/client";

// ═══════════════════════════════════════════════════════════════════════
// REA SORTEIOS — provably fair (commit-reveal HMAC-SHA256)
// O vencedor é apurado server-side (edge function raffle-draw); qualquer
// pessoa pode verificar a prova no browser com Web Crypto.
// ═══════════════════════════════════════════════════════════════════════

export type RaffleDrawCommit = {
  id: string;
  raffle_id: string;
  server_seed_hash: string;
  client_seed: string;
  nonce: number;
  status: "committed" | "revealed";
  committed_at: string;
  revealed_at: string | null;
};

export type RaffleDrawResult = {
  id: string;
  commit_id: string;
  raffle_id: string;
  server_seed: string;
  winner_participant_id: string | null;
  winner_ticket: number | null;
  winner_user_id: string | null;
  participants_count: number;
  draw_index: number;
  method: string;
  formula: string;
  revealed_at: string;
};

/** Busca o compromisso mais recente de um sorteio. */
export async function getDrawCommit(raffleId: string): Promise<RaffleDrawCommit | null> {
  const { data, error } = await (supabase as any)
    .from("raffle_draw_commits")
    .select("*")
    .eq("raffle_id", raffleId)
    .order("nonce", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as RaffleDrawCommit) ?? null;
}

/** Busca o resultado revelado de um compromisso. */
export async function getDrawResult(commitId: string): Promise<RaffleDrawResult | null> {
  const { data, error } = await (supabase as any)
    .from("raffle_draw_results")
    .select("*")
    .eq("commit_id", commitId)
    .order("revealed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return null;
  return (data as RaffleDrawResult) ?? null;
}

/** Últimos resultados revelados (página de transparência). */
export async function getRecentDrawResults(limit = 10): Promise<RaffleDrawResult[]> {
  const { data, error } = await (supabase as any)
    .from("raffle_draw_results")
    .select("*")
    .order("revealed_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data as RaffleDrawResult[]) ?? [];
}

/** Fase commit — publica o compromisso do sorteio (dono/staff). */
export async function commitRaffleDraw(raffleId: string): Promise<{ ok: boolean; commit?: RaffleDrawCommit; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Sessão necessária" };
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raffle-draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ raffle_id: raffleId, phase: "commit" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? `Erro ${res.status}` };
  return { ok: true, commit: json.commit };
}

/** Fase reveal — revela o seed e apura o vencedor (dono/staff). */
export async function revealRaffleDraw(raffleId: string): Promise<{ ok: boolean; result?: any; error?: string }> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return { ok: false, error: "Sessão necessária" };
  const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/raffle-draw`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
    body: JSON.stringify({ raffle_id: raffleId, phase: "reveal" }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? `Erro ${res.status}` };
  return { ok: true, result: json };
}

// ── Verificação client-side (Web Crypto — independente do servidor)

export async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function hmacSha256Hex(key: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const cryptoKey = await crypto.subtle.importKey("raw", enc.encode(key), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(message));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type DrawVerification = {
  seedMatchesCommit: boolean;
  recomputedIndex: number | null;
  expectedIndex: number;
  participantsCount: number;
  pass: boolean;
};

/**
 * Verifica uma prova de sorteio no browser:
 *  1. SHA-256(server_seed) === server_seed_hash (o compromisso era este seed)
 *  2. HMAC-SHA256(server_seed, "client_seed:nonce") mod N === draw_index
 */
export async function verifyDrawProof(
  serverSeed: string,
  serverSeedHash: string,
  clientSeed: string,
  nonce: number,
  drawIndex: number,
  participantsCount: number
): Promise<DrawVerification> {
  const seedHash = await sha256Hex(serverSeed);
  const seedMatchesCommit = seedHash === serverSeedHash;
  let recomputedIndex: number | null = null;
  if (seedMatchesCommit && participantsCount > 0) {
    const hmac = await hmacSha256Hex(serverSeed, `${clientSeed}:${nonce}`);
    const value = BigInt("0x" + hmac.slice(0, 13));
    recomputedIndex = Number(value % BigInt(participantsCount));
  }
  return {
    seedMatchesCommit,
    recomputedIndex,
    expectedIndex: drawIndex,
    participantsCount,
    pass: seedMatchesCommit && recomputedIndex === drawIndex,
  };
}
