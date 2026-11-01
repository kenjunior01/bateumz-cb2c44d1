// ═══════════════════════════════════════════════════════════════════════
// REA APIS PÚBLICAS v25 — Cliente FreeToGame (catálogo real de jogos F2P)
//
// Fonte: freetogame.com/api (public-apis → Games) — pública, sem chave,
// CORS aberto (Access-Control-Allow-Origin: *, validado ao vivo).
// Estratégia: UM único pedido ?sort-by=popularity (catálogo inteiro,
// ~400 jogos) + cache longo (60 min) + filtragem/ordenação 100% no
// cliente — nunca martelamos a API com um pedido por filtro.
// Atribuição obrigatória: "Catálogo de jogos © FreeToGame".
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://www.freetogame.com/api/games";
const CACHE_KEY = "bateu-freegames-v1:all";
const CACHE_TTL = 60 * 60_000;

export interface FreeGame {
  id: number;
  title: string;
  thumbnail: string;
  short_description: string;
  game_url: string;
  genre: string;
  platform: string; // "PC (Windows)" | "Web Browser"
  publisher: string;
  developer: string;
  release_date: string; // YYYY-MM-DD
  freetogame_profile_url: string;
}

export const FREE_GAMES_ATTRIBUTION = "Catálogo de jogos © FreeToGame (freetogame.com)";

// ── Camada de rede: cache + dedupe + stale-on-error ─────────────────────

interface CacheEntry<T> {
  t: number;
  data: T;
}

function readCache(): { fresh: FreeGame[] | null; stale: FreeGame[] | null } {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return { fresh: null, stale: null };
    const entry = JSON.parse(raw) as CacheEntry<FreeGame[]>;
    const fresh = Date.now() - entry.t < CACHE_TTL ? entry.data : null;
    return { fresh, stale: entry.data };
  } catch {
    return { fresh: null, stale: null };
  }
}

function writeCache(data: FreeGame[]) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ t: Date.now(), data }));
  } catch {
    // quota cheia — cache é best-effort
  }
}

let inFlight: Promise<FreeGame[]> | null = null;

/** Catálogo completo (uma chamada, cacheado — sem pedidos por filtro). */
export async function getFreeGames(opts?: { fresh?: boolean }): Promise<FreeGame[]> {
  const { fresh: cachedFresh, stale } = readCache();
  if (!opts?.fresh && cachedFresh !== null) return cachedFresh;
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const res = await fetch(`${API_BASE}?sort-by=popularity`, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`FreeToGame HTTP ${res.status}`);
      const data = (await res.json()) as FreeGame[];
      writeCache(data);
      return data;
    } catch (err) {
      if (stale !== null) return stale; // offline/429 → último catálogo válido
      throw err;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/** Limpa a cache do catálogo (botão atualizar). */
export function clearFreeGamesCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // noop
  }
}

// ── Filtragem/ordenação (100% cliente) ──────────────────────────────────

export type FreePlatformFilter = "all" | "pc" | "browser";
export type FreeSort = "popularity" | "alpha" | "release";

/** Normaliza para busca sem acentos (Maputo/Moçambique: pt misto com inglês). */
function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function filterFreeGames(
  games: FreeGame[],
  opts: { platform?: FreePlatformFilter; genre?: string; query?: string; sort?: FreeSort },
): FreeGame[] {
  const platform = opts.platform ?? "all";
  const genre = opts.genre ?? "";
  const q = norm((opts.query ?? "").trim());

  let out = games.filter((g) => {
    if (platform === "pc" && !/^pc/i.test(g.platform)) return false;
    if (platform === "browser" && !/browser/i.test(g.platform)) return false;
    if (genre && g.genre !== genre) return false;
    if (q) {
      const hay = norm(`${g.title} ${g.publisher} ${g.developer} ${g.genre}`);
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (opts.sort === "alpha") {
    out = [...out].sort((a, b) => a.title.localeCompare(b.title));
  } else if (opts.sort === "release") {
    out = [...out].sort((a, b) => (b.release_date ?? "").localeCompare(a.release_date ?? ""));
  }
  return out;
}

/** Géneros presentes no catálogo (ordenados por quantidade). */
export function availableGenres(games: FreeGame[]): Array<{ genre: string; count: number }> {
  const counts = new Map<string, number>();
  games.forEach((g) => counts.set(g.genre, (counts.get(g.genre) ?? 0) + 1));
  return [...counts.entries()]
    .map(([genre, count]) => ({ genre, count }))
    .sort((a, b) => b.count - a.count);
}

/** Ano de lançamento curto para o cartão. */
export function releaseYear(g: FreeGame): string {
  return (g.release_date ?? "").slice(0, 4) || "—";
}
