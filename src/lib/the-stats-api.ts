/**
 * Football stats — powered by RapidAPI Free Live Football Data.
 * Replaces the old The Stats API integration.
 */
import {
  fetchLeagueMatches,
  fetchLiveScores,
  fetchFixturesByDate,
  fetchWorldCupPlayers as fetchPlayersFromApi,
  fetchWorldCupMatchesForFantasy,
  findWorldCupLeagueId,
  DEFAULT_SEASON,
  type LiveMatch,
} from "./football-api";

export interface Competition {
  id: string;
  name: string;
  country: string;
  country_code: string;
  type: "league" | "cup";
  has_team_stats: boolean;
  has_player_stats: boolean;
  xg_available: boolean;
}

export interface Team {
  id: string;
  name: string;
  logo?: string;
  country: string;
}

export interface Player {
  id: string;
  name: string;
  position?: string;
  nationality?: string;
  current_team?: Team;
  image?: string;
}

export interface Match {
  id: string;
  competition_id?: string;
  home_team: Team;
  away_team: Team;
  status: "upcoming" | "live" | "completed";
  kickoff_time: string;
  home_score?: number;
  away_score?: number;
}

export interface ApiResponse<T> {
  data: T[];
  meta: { page: number; per_page: number; total: number; total_pages: number };
}

export interface ApiSingleResponse<T> {
  data: T;
}

export interface OldPlayer {
  id: number;
  name: string;
  team: string;
  position: string;
  image?: string;
  goals?: number;
  assists?: number;
  yellowCards?: number;
  redCards?: number;
  minutesPlayed?: number;
  cleanSheets?: number;
  saves?: number;
}

export interface OldMatch {
  id: number | string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  score?: string;
}

function liveToMatch(m: LiveMatch): Match {
  const isLive = m.status.toLowerCase().includes("live") || m.minute !== "";
  return {
    id: m.id,
    home_team: { id: m.id + "-h", name: m.homeTeam, country: "" },
    away_team: { id: m.id + "-a", name: m.awayTeam, country: "" },
    status: isLive ? "live" : m.homeScore != null ? "completed" : "upcoming",
    kickoff_time: m.date || new Date().toISOString(),
    home_score: m.homeScore ?? undefined,
    away_score: m.awayScore ?? undefined,
  };
}

export const checkApiHealth = async () => {
  const live = await fetchLiveScores();
  return { status: live.length >= 0 ? "ok" : "degraded", timestamp: new Date().toISOString() };
};

export const fetchCompetitions = async (): Promise<Competition[]> => {
  const leagueId = await findWorldCupLeagueId();
  return [
    {
      id: String(leagueId),
      name: "FIFA World Cup",
      country: "International",
      country_code: "INT",
      type: "cup",
      has_team_stats: true,
      has_player_stats: true,
      xg_available: false,
    },
  ];
};

export const fetchMatches = async (): Promise<Match[]> => {
  const live = await fetchLiveScores();
  if (live.length > 0) return live.map(liveToMatch);
  const today = await fetchFixturesByDate();
  return today.map(liveToMatch);
};

export const fetchMatchById = async (matchId: string): Promise<Match | null> => {
  const all = await fetchMatches();
  return all.find((m) => m.id === matchId) || null;
};

export const fetchWorldCupMatchesApi = async (): Promise<Match[]> => {
  const leagueId = await findWorldCupLeagueId();
  const fixtures = await fetchLeagueMatches(leagueId, DEFAULT_SEASON);
  if (fixtures.length === 0) return fetchMatches();
  return fixtures.map((f) => ({
    id: String(f.fixture.id),
    home_team: { id: String(f.teams.home.id), name: f.teams.home.name, country: "" },
    away_team: { id: String(f.teams.away.id), name: f.teams.away.name, country: "" },
    status:
      f.fixture.status.short === "FT"
        ? "completed"
        : ["1H", "2H", "HT", "LIVE"].includes(f.fixture.status.short)
          ? "live"
          : "upcoming",
    kickoff_time: f.fixture.date,
    home_score: f.goals.home ?? undefined,
    away_score: f.goals.away ?? undefined,
  }));
};

export const fetchWorldCupMatches = async (): Promise<OldMatch[]> => {
  const data = await fetchWorldCupMatchesForFantasy();
  return data.map((m, i) => ({
    id: m.id || i + 1,
    homeTeam: m.homeTeam,
    awayTeam: m.awayTeam,
    date: m.date,
    score: m.score,
  }));
};

export const fetchWorldCupPlayers = async (): Promise<OldPlayer[]> => {
  const players = await fetchPlayersFromApi();
  return players.map((p, i) => ({
    id: Number(p.id) || i + 1,
    name: p.name,
    team: p.team,
    position: p.position,
    image: p.photo,
    goals: p.goals,
    assists: p.assists,
  }));
};

export const fetchWorldCupMatchesOld = fetchWorldCupMatches;
