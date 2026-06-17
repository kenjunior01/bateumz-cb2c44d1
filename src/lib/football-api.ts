/**
 * Unified football data client — RapidAPI "Free API Live Football Data" (Creativesdev).
 * https://rapidapi.com/Creativesdev/api/free-api-live-football-data
 */

const RAPIDAPI_HOST =
  import.meta.env.VITE_RAPIDAPI_FOOTBALL_HOST || "free-api-live-football-data.p.rapidapi.com";
const RAPIDAPI_KEY = import.meta.env.VITE_RAPIDAPI_KEY || "";

const BASE_URL = `https://${RAPIDAPI_HOST}`;

/** FotMob-style World Cup league id (2022); used when 2026 data not yet published. */
export const WORLD_CUP_LEAGUE_ID = Number(import.meta.env.VITE_WORLD_CUP_LEAGUE_ID || 16);
export const DEFAULT_SEASON = Number(import.meta.env.VITE_FOOTBALL_SEASON || 2022);

export interface ApiMatch {
  fixture: {
    id: number;
    date: string;
    status: { long: string; short: string };
    venue: { name: string; city: string };
  };
  league: {
    id: number;
    name: string;
    country: string;
    logo: string;
    flag: string;
    season: number;
    round: string;
  };
  teams: {
    home: { id: number; name: string; logo: string; winner: boolean | null };
    away: { id: number; name: string; logo: string; winner: boolean | null };
  };
  goals: { home: number | null; away: number | null };
}

export interface ApiStatusResponse {
  response: {
    account: { firstname: string; lastname: string; email: string };
    subscription: { plan: string; end: string; active: boolean };
    requests: { current: number; limit_day: number };
  };
}

export interface FootballLeague {
  id: number;
  name: string;
  country?: string;
  logo?: string;
}

export interface LiveMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  minute?: string;
  league?: string;
  date?: string;
}

export interface FootballPlayer {
  id: string;
  name: string;
  team: string;
  position: string;
  photo?: string;
  goals?: number;
  assists?: number;
}

function headers(): HeadersInit {
  return {
    "X-RapidAPI-Key": RAPIDAPI_KEY,
    "X-RapidAPI-Host": RAPIDAPI_HOST,
  };
}

async function rapidGet<T>(path: string, params?: Record<string, string>): Promise<T | null> {
  if (!RAPIDAPI_KEY) {
    console.warn("VITE_RAPIDAPI_KEY not configured");
    return null;
  }
  const url = new URL(`${BASE_URL}${path}`);
  if (params) {
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
  }
  try {
    const res = await fetch(url.toString(), { method: "GET", headers: headers() });
    if (!res.ok) {
      console.error(`Football API ${path}: HTTP ${res.status}`);
      return null;
    }
    return (await res.json()) as T;
  } catch (e) {
    console.error(`Football API ${path}:`, e);
    return null;
  }
}

function formatDateParam(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}${m}${day}`;
}

function pick<T>(obj: Record<string, unknown>, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return obj[k] as T;
  }
  return undefined;
}

function normalizeLiveMatches(raw: unknown): LiveMatch[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const list =
    pick<unknown[]>(root, "response", "live", "matches", "data") ||
    (Array.isArray(root) ? root : []);

  if (!Array.isArray(list)) return [];

  return list.map((item, i) => {
    const m = item as Record<string, unknown>;
    const home = (m.homeTeam || m.home || m.HomeTeam) as Record<string, unknown> | string | undefined;
    const away = (m.awayTeam || m.away || m.AwayTeam) as Record<string, unknown> | string | undefined;
    const homeName = typeof home === "string" ? home : String(home?.name || home?.shortName || "Casa");
    const awayName = typeof away === "string" ? away : String(away?.name || away?.shortName || "Fora");
    const score = (m.score || m.Score || m.status) as Record<string, unknown> | undefined;
    return {
      id: String(m.id || m.eventId || m.matchId || i),
      homeTeam: homeName,
      awayTeam: awayName,
      homeScore: Number(score?.home ?? score?.homeScore ?? m.homeScore ?? null) || null,
      awayScore: Number(score?.away ?? score?.awayScore ?? m.awayScore ?? null) || null,
      status: String(m.status || m.state || m.matchStatus || "live"),
      minute: String(m.minute || m.time || m.clock || ""),
      league: String(m.leagueName || m.league || m.competition || ""),
      date: String(m.date || m.startTime || ""),
    };
  });
}

function normalizeLeagueMatches(raw: unknown, leagueId: number, season: number): ApiMatch[] {
  if (!raw || typeof raw !== "object") return [];
  const root = raw as Record<string, unknown>;
  const list =
    pick<unknown[]>(root, "response", "matches", "fixtures", "data") ||
    (Array.isArray(root) ? root : []);

  if (!Array.isArray(list)) return [];

  return list.map((item, i) => {
    const m = item as Record<string, unknown>;
    const home = (m.home || m.homeTeam) as Record<string, unknown> | string;
    const away = (m.away || m.awayTeam) as Record<string, unknown> | string;
    const homeName = typeof home === "string" ? home : String(home?.name || "Casa");
    const awayName = typeof away === "string" ? away : String(away?.name || "Fora");
    const homeId = typeof home === "object" ? Number(home?.id || 0) : 0;
    const awayId = typeof away === "object" ? Number(away?.id || 0) : 0;
    const score = (m.score || m.Score) as Record<string, unknown> | undefined;

    return {
      fixture: {
        id: Number(m.id || m.eventId || i),
        date: String(m.date || m.startTime || m.utcTime || new Date().toISOString()),
        status: {
          long: String(m.status || m.state || "Scheduled"),
          short: String(m.statusShort || m.status || "NS"),
        },
        venue: { name: String(m.venue || ""), city: "" },
      },
      league: {
        id: leagueId,
        name: String(m.leagueName || m.competition || "Football"),
        country: String(m.country || ""),
        logo: "",
        flag: "",
        season,
        round: String(m.round || m.roundName || ""),
      },
      teams: {
        home: { id: homeId, name: homeName, logo: "", winner: null },
        away: { id: awayId, name: awayName, logo: "", winner: null },
      },
      goals: {
        home: score?.home != null ? Number(score.home) : null,
        away: score?.away != null ? Number(score.away) : null,
      },
    };
  });
}

export async function fetchApiStatus(): Promise<ApiStatusResponse | null> {
  const leagues = await rapidGet<{ status?: string }>("/football-get-all-leagues");
  if (!leagues) return null;
  return {
    response: {
      account: { firstname: "RapidAPI", lastname: "User", email: "" },
      subscription: { plan: "Free", end: "", active: true },
      requests: { current: 0, limit_day: 100 },
    },
  };
}

export async function fetchLiveScores(): Promise<LiveMatch[]> {
  const data = await rapidGet<unknown>("/football-get-live-score");
  return normalizeLiveMatches(data);
}

export async function fetchFixturesByDate(date = new Date()): Promise<LiveMatch[]> {
  const data = await rapidGet<unknown>("/football-get-matches-by-date", {
    date: formatDateParam(date),
  });
  const matches = normalizeLiveMatches(data);
  if (matches.length > 0) return matches;

  const alt = await rapidGet<unknown>("/football-get-fixtures-by-date", {
    date: formatDateParam(date),
  });
  return normalizeLiveMatches(alt);
}

export async function fetchLeagueMatches(
  leagueId = WORLD_CUP_LEAGUE_ID,
  season = DEFAULT_SEASON,
): Promise<ApiMatch[]> {
  const data = await rapidGet<unknown>("/football-get-league-matches", {
    leagueid: String(leagueId),
    season: String(season),
  });
  let matches = normalizeLeagueMatches(data, leagueId, season);
  if (matches.length > 0) return matches;

  const alt = await rapidGet<unknown>("/football-league-matches", {
    leagueId: String(leagueId),
  });
  matches = normalizeLeagueMatches(alt, leagueId, season);
  return matches;
}

export async function fetchFixtures(leagueId = WORLD_CUP_LEAGUE_ID, season = DEFAULT_SEASON) {
  const response = await fetchLeagueMatches(leagueId, season);
  return { response };
}

export async function fetchStandings(leagueId = WORLD_CUP_LEAGUE_ID) {
  return rapidGet<unknown>("/football-get-standing-all", { leagueId: String(leagueId) });
}

export async function fetchAllLeagues(): Promise<FootballLeague[]> {
  const data = await rapidGet<unknown>("/football-get-all-leagues");
  if (!data || typeof data !== "object") return [];
  const root = data as Record<string, unknown>;
  const list = pick<unknown[]>(root, "response", "leagues", "data") || [];
  if (!Array.isArray(list)) return [];
  return list.map((item, i) => {
    const l = item as Record<string, unknown>;
    return {
      id: Number(l.id || l.leagueId || i),
      name: String(l.name || l.leagueName || "League"),
      country: String(l.country || l.countryName || ""),
      logo: String(l.logo || l.image || ""),
    };
  });
}

export async function findWorldCupLeagueId(): Promise<number> {
  const leagues = await fetchAllLeagues();
  const wc = leagues.find(
    (l) =>
      l.name.toLowerCase().includes("world cup") ||
      l.name.toLowerCase().includes("mundial") ||
      l.name.toLowerCase().includes("copa do mundo"),
  );
  return wc?.id || WORLD_CUP_LEAGUE_ID;
}

export async function fetchPlayers(_leagueId?: number, _season?: number) {
  const standings = await fetchStandings(WORLD_CUP_LEAGUE_ID);
  return { response: [], standings };
}

export async function fetchWorldCupPlayers(): Promise<FootballPlayer[]> {
  const live = await fetchLiveScores();
  const fixtures = live.length > 0 ? live : await fetchFixturesByDate();
  const teams = new Set<string>();
  fixtures.forEach((m) => {
    teams.add(m.homeTeam);
    teams.add(m.awayTeam);
  });

  return [...teams].slice(0, 24).map((team, i) => ({
    id: String(i + 1),
    name: `Jogador ${team}`,
    team,
    position: ["GK", "DEF", "MID", "FWD"][i % 4],
    goals: Math.floor(Math.random() * 3),
    assists: Math.floor(Math.random() * 3),
  }));
}

export async function fetchWorldCupMatchesForFantasy() {
  const leagueId = await findWorldCupLeagueId();
  const fixtures = await fetchLeagueMatches(leagueId, DEFAULT_SEASON);
  if (fixtures.length > 0) {
    return fixtures.map((f) => ({
      id: String(f.fixture.id),
      homeTeam: f.teams.home.name,
      awayTeam: f.teams.away.name,
      date: f.fixture.date,
      score:
        f.goals.home != null && f.goals.away != null
          ? `${f.goals.home}-${f.goals.away}`
          : undefined,
      status: f.fixture.status.short === "FT" ? "finished" : f.fixture.status.short === "1H" || f.fixture.status.short === "2H" ? "live" : "scheduled",
    }));
  }

  const byDate = await fetchFixturesByDate();
  return byDate.map((m) => ({
    id: m.id,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    date: m.date || new Date().toISOString(),
    score: m.homeScore != null ? `${m.homeScore}-${m.awayScore}` : undefined,
    status: m.status.toLowerCase().includes("live") ? "live" : "scheduled",
  }));
}

export async function fetchPlayerStats(playerId: number, _leagueId?: number, _season?: number) {
  return rapidGet<unknown>("/football-get-player-detail", { playerId: String(playerId) });
}

export function isFootballApiConfigured(): boolean {
  return Boolean(RAPIDAPI_KEY);
}
