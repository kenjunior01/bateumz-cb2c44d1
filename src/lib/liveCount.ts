/**
 * liveCount — v26.2 Web Excellence
 *
 * Contador partilhado de lives activas (tabela `lives`, status=active).
 *
 * Medido antes de criar: MobileTopBar e MobileMenuDrawer — ambos montados em
 * mobile, e um deles também em desktop — pediam o MESMO count à Supabase em
 * paralelo (2 pedidos head por arranque + reloads por evento realtime em cada
 * componente). Agora: 1 pedido serve todos os leitores, com TTL de 30s e dedup
 * de pedidos em voo; o canal realtime é ÚNICO para toda a app e apenas
 * invalida a cache — quem relê é o getter partilhado.
 *
 * Honesto por defeito: devolve null quando a fonte está indisponível — os
 * componentes decidem mostrar 0/esconder; NUNCA inventa um valor.
 */

const TTL_MS = 30_000;

type Listener = (n: number | null) => void;

let cached: { at: number; value: number | null } | null = null;
let inFlight: Promise<number | null> | null = null;
let realtimeChannel: any = null;
const listeners = new Set<Listener>();

async function fetchCount(): Promise<number | null> {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { count, error } = await (supabase as any)
      .from("lives")
      .select("id", { count: "exact", head: true })
      .eq("status", "active");
    if (error) return null;
    return typeof count === "number" ? count : 0;
  } catch {
    return null;
  }
}

/** Valor com TTL; null = indisponível (sem inventar dados). */
export function getActiveLiveCount(): Promise<number | null> {
  const now = Date.now();
  if (cached && now - cached.at < TTL_MS) return Promise.resolve(cached.value);
  if (inFlight) return inFlight;
  inFlight = fetchCount().then((value) => {
    cached = { at: Date.now(), value };
    listeners.forEach((l) => l(value));
    return value;
  }).finally(() => { inFlight = null; });
  return inFlight;
}

function ensureRealtimeChannel() {
  if (realtimeChannel) return;
  import("@/integrations/supabase/client").then(({ supabase }) => {
    realtimeChannel = (supabase as any)
      .channel("bateu-live-count")
      .on("postgres_changes", { event: "*", schema: "public", table: "lives" }, () => {
        cached = null; // força revalidação partilhada no próximo getActiveLiveCount
        getActiveLiveCount();
      })
      .subscribe();
  }).catch(() => { /* sem realtime — TTL continua a funcionar */ });
}

/**
 * Subscreve mudanças do contador partilhado. Com realtime:true, instala (1×
 * por app) o canal postgres_changes global que invalida a cache.
 */
export function subscribeActiveLiveCount(
  listener: Listener,
  opts?: { realtime?: boolean }
): () => void {
  listeners.add(listener);
  if (opts?.realtime) ensureRealtimeChannel();
  return () => {
    listeners.delete(listener);
    // O canal mantém-se vivo para os restantes subscritores (singleton por app).
  };
}

/** Testes E2E: esquece o valor em cache (nunca usado em produção). */
export function __invalidateLiveCountCache() {
  cached = null;
}
