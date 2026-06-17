const API_KEY = "fapi_HfDFosDgHNoNMULNU3TlpB1DLaVAcHSG";
const BASE_URL = "https://api.thestatsapi.com/api/football";

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
  date_of_birth?: string;
  nationality?: string;
  current_team?: Team;
  number?: number;
  image?: string;
}

export interface Match {
  id: string;
  competition_id?: string;
  home_team: Team;
  away_team: Team;
  status: "upcoming" | "live" | "completed";
  kickoff_time: string;
  venue?: string;
  home_score?: number;
  away_score?: number;
  has_xg?: boolean;
  has_odds?: boolean;
}

export interface ApiResponse<T> {
  data: T[];
  meta: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export interface ApiSingleResponse<T> {
  data: T;
}

export const checkApiHealth = async (): Promise<{ status: string; timestamp: string } | null> => {
  try {
    const response = await fetch("https://api.thestatsapi.com/api/health", {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.json();
  } catch (error) {
    console.error("Error checking API health:", error);
    return null;
  }
};

export const fetchCompetitions = async (): Promise<Competition[]> => {
  try {
    const response = await fetch(`${BASE_URL}/competitions`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiResponse<Competition> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching competitions:", error);
    return [];
  }
};

export const fetchMatches = async (dateFrom?: string, dateTo?: string): Promise<Match[]> => {
  try {
    let url = `${BASE_URL}/matches`;
    const params = new URLSearchParams();
    if (dateFrom) params.append("date_from", dateFrom);
    if (dateTo) params.append("date_to", dateTo);
    if (params.toString()) {
      url += `?${params.toString()}`;
    }
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiResponse<Match> = await response.json();
    return data.data || [];
  } catch (error) {
    console.error("Error fetching matches:", error);
    return [];
  }
};

export const fetchMatchById = async (matchId: string): Promise<Match | null> => {
  try {
    const response = await fetch(`${BASE_URL}/matches/${matchId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
      },
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: ApiSingleResponse<Match> = await response.json();
    return data.data;
  } catch (error) {
    console.error("Error fetching match:", error);
    return null;
  }
};

export const fetchWorldCupMatches = async (): Promise<Match[]> => {
  try {
    const competitions = await fetchCompetitions();
    const worldCup = competitions.find(c => c.name.toLowerCase().includes("world cup"));
    
    const allMatches = await fetchMatches();
    if (worldCup) {
      return allMatches.filter(m => m.competition_id === worldCup.id);
    }
    return allMatches;
  } catch (error) {
    console.error("Error fetching World Cup matches:", error);
    return [];
  }
};
