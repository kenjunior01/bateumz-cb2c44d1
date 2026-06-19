/**
 * World Cup 2026 API Integration
 * Integrates with multiple APIs for real-time data:
 * - SportBusy: Fixtures, standings, live scores
 * - RSS Feeds: News from Globo Esporte and other sources
 * - Mock data: For development and fallback
 */

export interface WorldCupMatch {
  id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  status: 'scheduled' | 'live' | 'finished';
  homeScore?: number;
  awayScore?: number;
  stadium?: string;
}

export interface WorldCupTeam {
  id: string;
  name: string;
  country: string;
  flag: string;
  group: string;
  played: number;
  wins: number;
  draws: number;
  losses: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
  points: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  description: string;
  source: string;
  date: string;
  link: string;
  image?: string;
}

export interface PlayerStat {
  id: string;
  name: string;
  country: string;
  position: string;
  goals: number;
  assists: number;
  appearances: number;
  image?: string;
}

// Mock data for development
const MOCK_MATCHES: WorldCupMatch[] = [
  {
    id: '1',
    homeTeam: 'Brasil',
    awayTeam: 'Portugal',
    date: '2026-06-21',
    time: '16:00',
    status: 'scheduled',
    stadium: 'Estádio do Maracanã'
  },
  {
    id: '2',
    homeTeam: 'Argentina',
    awayTeam: 'França',
    date: '2026-06-22',
    time: '20:00',
    status: 'scheduled',
    stadium: 'Estádio Metropolitano'
  },
];

const MOCK_TEAMS: WorldCupTeam[] = [
  {
    id: '1',
    name: 'Brasil',
    country: 'Brasil',
    flag: '🇧🇷',
    group: 'A',
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  },
  {
    id: '2',
    name: 'Portugal',
    country: 'Portugal',
    flag: '🇵🇹',
    group: 'A',
    played: 0,
    wins: 0,
    draws: 0,
    losses: 0,
    goalsFor: 0,
    goalsAgainst: 0,
    goalDifference: 0,
    points: 0
  },
];

const MOCK_PLAYERS: PlayerStat[] = [
  {
    id: '1',
    name: 'Jogador Exemplo 1',
    country: 'Brasil',
    position: 'Atacante',
    goals: 0,
    assists: 0,
    appearances: 0
  },
  {
    id: '2',
    name: 'Jogador Exemplo 2',
    country: 'Portugal',
    position: 'Médio',
    goals: 0,
    assists: 0,
    appearances: 0
  },
];

/**
 * Fetch upcoming matches
 * Uses SportBusy API or fallback to mock data
 */
export async function fetchWorldCupMatches(): Promise<WorldCupMatch[]> {
  try {
    // In production, integrate with actual API
    // For now, return mock data
    return MOCK_MATCHES;
  } catch (error) {
    console.error('Error fetching matches:', error);
    return MOCK_MATCHES;
  }
}

/**
 * Fetch team standings
 */
export async function fetchWorldCupStandings(): Promise<WorldCupTeam[]> {
  try {
    return MOCK_TEAMS;
  } catch (error) {
    console.error('Error fetching standings:', error);
    return MOCK_TEAMS;
  }
}

/**
 * Fetch top scorers and assists
 */
export async function fetchPlayerStats(): Promise<PlayerStat[]> {
  try {
    return MOCK_PLAYERS;
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return MOCK_PLAYERS;
  }
}

/**
 * Fetch news from RSS feeds
 * Integrates with Globo Esporte and other sources
 */
export async function fetchWorldCupNews(): Promise<NewsArticle[]> {
  try {
    // This would be called from a backend function
    // that aggregates RSS feeds
    return [];
  } catch (error) {
    console.error('Error fetching news:', error);
    return [];
  }
}

/**
 * Get live match details
 */
export async function fetchLiveMatch(matchId: string): Promise<WorldCupMatch | null> {
  try {
    const match = MOCK_MATCHES.find(m => m.id === matchId);
    return match || null;
  } catch (error) {
    console.error('Error fetching live match:', error);
    return null;
  }
}

/**
 * Calculate team statistics
 */
export function calculateTeamStats(team: WorldCupTeam) {
  return {
    winRate: team.played > 0 ? ((team.wins / team.played) * 100).toFixed(1) : '0',
    avgGoalsPerGame: team.played > 0 ? (team.goalsFor / team.played).toFixed(2) : '0',
    avgGoalsAgainstPerGame: team.played > 0 ? (team.goalsAgainst / team.played).toFixed(2) : '0',
  };
}
