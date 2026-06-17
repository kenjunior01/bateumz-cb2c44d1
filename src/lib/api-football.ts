const API_KEY = "499d3679c952dd2c3ed57f4278c68676";
const BASE_URL = "https://v3.football.api-sports.io";

export interface ApiPlayer {
  id: number;
  name: string;
  position: string;
  team: { id: number; name: string; logo: string };
  photo: string;
}

export interface ApiMatch {
  fixture: { id: number; date: string; status: { long: string; short: string }; venue: { name: string; city: string } };
  league: { id: number; name: string; country: string; logo: string; flag: string; season: number; round: string };
  teams: { home: { id: number; name: string; logo: string; winner: boolean | null }; away: { id: number; name: string; logo: string; winner: boolean | null } };
  goals: { home: number | null; away: number | null };
}

export const fetchPlayers = async (leagueId: number = 1, season: number = 2026) => {
  try {
    const response = await fetch(`${BASE_URL}/players?league=${leagueId}&season=${season}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching players:", error);
    throw error;
  }
};

export const fetchFixtures = async (leagueId: number = 1, season: number = 2026) => {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?league=${leagueId}&season=${season}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching fixtures:", error);
    throw error;
  }
};

export const fetchPlayerStats = async (playerId: number, leagueId: number = 1, season: number = 2026) => {
  try {
    const response = await fetch(`${BASE_URL}/players?season=${season}&id=${playerId}`, {
      method: "GET",
      headers: {
        "x-rapidapi-key": API_KEY,
        "x-rapidapi-host": "v3.football.api-sports.io",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Error fetching player stats:", error);
    throw error;
  }
};
