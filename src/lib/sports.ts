// ═══════════════════════════════════════════════════════════════════════
// REA DESPORTO v24 — Cliente TheSportsDB (dados REAIS, sem teatro)
//
// Fonte: TheSportsDB v1, chave de teste pública "123" (CORS aberto).
// Limites do plano gratuito respeitados e documentados na UI:
//   • eventsround  → jornada completa ✅ (base do hub)
//   • lookuptable  → Top 5 da classificação (não a tabela inteira)
//   • sem minuto-a-minuto — status honesto derivado dos dados/hora
// Camadas: cache localStorage com TTL + dedupe de pedidos em voo +
// fila serializada (≤1 pedido/1,5 s) + fallback stale-on-error.
// Atribuição obrigatória: "Dados desportivos © TheSportsDB".
// ═══════════════════════════════════════════════════════════════════════

const API_BASE = "https://www.thesportsdb.com/api/v1/json/123";
const CACHE_PREFIX = "bateu-sports-v1:";
const MIN_GAP_MS = 1500;

export interface SportLeague {
  id: string;
  name: string;
  short: string;
  country: string;
  badge?: string;
}

export interface SportEvent {
  id: string;
  leagueId: string;
  leagueName: string;
  season: string;
  round: number;
  name: string;
  home: string;
  away: string;
  homeBadge?: string;
  awayBadge?: string;
  kickoff: string; // ISO
  status: string; // bruto da fonte (NS, FT, 1H, HT, 2H…)
  homeScore: number | null;
  awayScore: number | null;
  venue?: string;
  postponed: boolean;
}

export interface SportStanding {
  rank: number;
  team: string;
  teamId: string;
  badge?: string;
  played: number;
  win: number;
  draw: number;
  loss: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  form: string;
}

export const SPORT_LEAGUES: SportLeague[] = [
  { id: "4328", name: "Premier League", short: "Premier", country: "Inglaterra" },
  { id: "4335", name: "La Liga", short: "LaLiga", country: "Espanha" },
  { id: "4332", name: "Serie A", short: "Serie A", country: "Itália" },
  { id: "4331", name: "Bundesliga", short: "Bundesliga", country: "Alemanha" },
  { id: "4334", name: "Ligue 1", short: "Ligue 1", country: "França" },
  { id: "4429", name: "Primeira Liga", short: "Primeira", country: "Portugal" },
  { id: "4480", name: "UEFA Champions League", short: "Champions", country: "Europa" },
  { id: "4387", name: "NBA", short: "NBA", country: "EUA" },
];

export function leagueById(id: string): SportLeague | undefined {
  return SPORT_LEAGUES.find((l) => l.id === id);
}

/** Temporada atual no formato da fonte (ex.: "2026-2027"). */
export function currentSeason(now = new Date()): string {
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth(); // 0-11
  // Épocas europeias/NBA: ago→mai. Antes de julho ainda é a época anterior.
  const start = m >= 7 ? y : y - 1;
  return `${start}-${start + 1}`;
}

// ── Camada de rede: fila serializada + cache + stale-on-error ──────────

let chain: Promise<unknown> = Promise.resolve();
let lastCall = 0;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchJson<T>(url: string): Promise<T> {
  const run = async () => {
    const gap = Date.now() - lastCall;
    if (gap < MIN_GAP_MS) await sleep(MIN_GAP_MS - gap);
    lastCall = Date.now();
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) throw new Error(`TheSportsDB HTTP ${res.status}`);
    return (await res.json()) as T;
  };
  const next = chain.then(run, run);
  chain = next.catch(() => undefined); // nunca deixa a fila morrer
  return next as Promise<T>;
}

interface CacheEntry<T> {
  t: number;
  data: T;
}

function readCache<T>(key: string, ttlMs: number): { fresh: T | null; stale: T | null } {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return { fresh: null, stale: null };
    const entry = JSON.parse(raw) as CacheEntry<T>;
    const fresh = Date.now() - entry.t < ttlMs ? entry.data : null;
    return { fresh, stale: entry.data };
  } catch {
    return { fresh: null, stale: null };
  }
}

function writeCache<T>(key: string, data: T) {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ t: Date.now(), data }));
  } catch {
    // quota cheia — cache é best-effort
  }
}

const inFlight = new Map<string, Promise<unknown>>();

async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>, fresh = false): Promise<T> {
  const { fresh: cachedFresh, stale } = readCache<T>(key, ttlMs);
  if (!fresh && cachedFresh !== null) return cachedFresh;
  const pending = inFlight.get(key);
  if (pending) return pending as Promise<T>;
  const p = loader()
    .then((data) => {
      writeCache(key, data);
      inFlight.delete(key);
      return data;
    })
    .catch((err) => {
      inFlight.delete(key);
      if (stale !== null) return stale; // offline/429 → último dado válido
      throw err;
    });
  inFlight.set(key, p);
  return p;
}

// ── Mapeamento ──────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapEvent(raw: any, season: string): SportEvent {
  const ts = raw.strTimestamp || (raw.dateEvent && raw.strTime ? `${raw.dateEvent} ${raw.strTime}` : raw.dateEvent);
  return {
    id: String(raw.idEvent),
    leagueId: String(raw.idLeague),
    leagueName: raw.strLeague ?? "",
    season: raw.strSeason ?? season,
    round: parseInt(raw.intRound ?? "0", 10) || 0,
    name: raw.strEvent ?? `${raw.strHomeTeam} vs ${raw.strAwayTeam}`,
    home: raw.strHomeTeam ?? "",
    away: raw.strAwayTeam ?? "",
    homeBadge: raw.strHomeTeamBadge || undefined,
    awayBadge: raw.strAwayTeamBadge || undefined,
    kickoff: ts ? new Date(ts.endsWith("Z") ? ts : `${ts}Z`).toISOString() : "",
    status: raw.strStatus || "NS",
    homeScore: raw.intHomeScore != null ? parseInt(raw.intHomeScore, 10) : null,
    awayScore: raw.intAwayScore != null ? parseInt(raw.intAwayScore, 10) : null,
    venue: raw.strVenue || undefined,
    postponed: (raw.strPostponed ?? "no") === "yes",
  };
}

// ── API pública ─────────────────────────────────────────────────────────

/** Jornada completa de uma liga (endpoint com dados íntegros no plano gratuito). */
export async function getRound(
  leagueId: string,
  season: string,
  round: number,
  opts?: { fresh?: boolean },
): Promise<SportEvent[]> {
  const key = `${leagueId}:round:${season}:${round}`;
  return cached(
    key,
    5 * 60_000,
    async () => {
      const body = await fetchJson<{ events: unknown[] | null }>(
        `${API_BASE}/eventsround.php?id=${leagueId}&r=${round}&s=${encodeURIComponent(season)}`,
      );
      return (body.events ?? []).map((e) => mapEvent(e, season));
    },
    opts?.fresh,
  );
}

/** Top 5 da classificação (limite do plano gratuito, comunicado na UI). */
export async function getStandings(leagueId: string, season: string): Promise<SportStanding[]> {
  return cached(`${leagueId}:table:${season}`, 30 * 60_000, async () => {
    const body = await fetchJson<{
      table?: Array<Record<string, string | null>>;
    }>(`${API_BASE}/lookuptable.php?l=${leagueId}&s=${encodeURIComponent(season)}`);
    return (body.table ?? []).map((r) => ({
      rank: parseInt(r.intRank ?? "0", 10) || 0,
      team: r.strTeam ?? "",
      teamId: String(r.idTeam ?? ""),
      badge: (r.strBadge || "").replace("/tiny", "") || undefined,
      played: parseInt(r.intPlayed ?? "0", 10) || 0,
      win: parseInt(r.intWin ?? "0", 10) || 0,
      draw: parseInt(r.intDraw ?? "0", 10) || 0,
      loss: parseInt(r.intLoss ?? "0", 10) || 0,
      goalsFor: parseInt(r.intGoalsFor ?? "0", 10) || 0,
      goalsAgainst: parseInt(r.intGoalsAgainst ?? "0", 10) || 0,
      points: parseInt(r.intPoints ?? "0", 10) || 0,
      form: r.strForm ?? "",
    }));
  });
}

/** Pista da jornada atual: jogos disputados por todos + 1 (heurística honesta). */
export function currentRoundHint(standings: SportStanding[]): number | null {
  if (!standings.length) return null;
  const played = standings.map((s) => s.played);
  const max = Math.max(...played);
  return max > 0 ? max + 1 : 1;
}

export type DerivedStatus = "NS" | "LIVE" | "HT" | "FT" | "POSTP";

/** Estado honesto: o que a fonte diz + derivação por relógio (nunca inventa minuto). */
export function deriveStatus(ev: SportEvent, now = new Date()): DerivedStatus {
  if (ev.postponed) return "POSTP";
  const s = ev.status?.toUpperCase();
  if (s === "FT" || s === "MATCH_FINISHED" || s === "AET" || s === "PEN") return "FT";
  if (s === "1H" || s === "2H" || s === "LIVE" || s === "IN PLAY") return "LIVE";
  if (s === "HT") return "HT";
  if (!ev.kickoff) return "NS";
  const t = new Date(ev.kickoff).getTime();
  const diff = now.getTime() - t;
  if (diff < 0) return "NS";
  // Jogo em curso ou recentemente terminado e a fonte ainda não publicou o placar:
  // futebol ~2h, NBA ~2,5h — estado "LIVE" sem minuto nem placar fabricados.
  const window = ev.leagueId === "4387" ? 150 : 120;
  if (diff < window * 60_000) return "LIVE";
  return "FT";
}

export function isPredictable(ev: SportEvent, now = new Date()): boolean {
  return !ev.postponed && !!ev.kickoff && new Date(ev.kickoff).getTime() > now.getTime() + 60_000;
}

export function formatKickoff(iso: string): string {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("pt-PT", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Limpa toda a cache desportiva (usado pelo botão atualizar). */
export function clearSportsCache() {
  try {
    const keys: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k?.startsWith(CACHE_PREFIX)) keys.push(k);
    }
    keys.forEach((k) => localStorage.removeItem(k));
  } catch {
    // noop
  }
}

export const SPORTS_ATTRIBUTION = "Dados desportivos © TheSportsDB (plano gratuito)";
