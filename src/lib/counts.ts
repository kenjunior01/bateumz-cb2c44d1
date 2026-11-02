/**
 * counts — v26.2 Web Excellence
 *
 * Contagens head (count:"exact", head:true) partilhadas com TTL de 30s e dedup
 * de pedidos em voo, por (tabela + filtro igual).
 *
 * Medido antes de criar: a home pedia 2× o count de `raffles` activos e 2× o de
 * `live_sessions` activos (Index.tsx usa os MESMOS counts no stats e no ticker;
 * o Navbar pedia o de live_sessions outra vez) — cada componente por sua conta.
 * Agora: 1 pedido por 30s serve todos. Honesto: devolve null quando a fonte
 * falha (componentes decidem mostrar 0/esconder; NUNCA inventa).
 */

const DEFAULT_TTL_MS = 30_000;

const cache = new Map<string, { at: number; value: number | null }>();
const inFlight = new Map<string, Promise<number | null>>();

export interface CountFilter {
  col: string;
  val: string;
}

export async function countRows(
  table: string,
  filter?: CountFilter,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<number | null> {
  const key = `${table}|${filter ? `${filter.col}=${filter.val}` : ""}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value;
  const going = inFlight.get(key);
  if (going) return going;

  const exec = (async () => {
    try {
      const { supabase } = await import("@/integrations/supabase/client");
      let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
      if (filter) q = q.eq(filter.col, filter.val);
      const { count, error } = await q;
      if (error) return null;
      return typeof count === "number" ? count : 0;
    } catch {
      return null;
    }
  })();

  inFlight.set(key, exec);
  try {
    const value = await exec;
    cache.set(key, { at: Date.now(), value });
    return value;
  } finally {
    inFlight.delete(key);
  }
}

/** Testes E2E: esquece valores em cache (nunca usado em produção). */
export function __invalidateCountsCache() {
  cache.clear();
  inFlight.clear();
}
