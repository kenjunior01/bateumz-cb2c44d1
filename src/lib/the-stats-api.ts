const API_KEY = "fapi_HfDFosDgHNoNMULNU3TlpB1DLaVAcHSG";
const BASE_URL = "https://api.thestatsapi.com";

export interface Player {
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

export interface Match {
  id: number;
  homeTeam: string;
  awayTeam: string;
  date: string;
  score?: string;
}

export const fetchWorldCupPlayers = async (): Promise<Player[]> => {
  try {
    const response = await fetch(`${BASE_URL}/players?api_key=${API_KEY}&season=2026&league=world_cup`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.response || data || [];
  } catch (error) {
    console.error("Error fetching World Cup players:", error);
    return [];
  }
};

export const fetchWorldCupMatches = async (): Promise<Match[]> => {
  try {
    const response = await fetch(`${BASE_URL}/fixtures?api_key=${API_KEY}&season=2026&league=world_cup`, {
      method: "GET",
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data = await response.json();
    return data.response || data || [];
  } catch (error) {
    console.error("Error fetching World Cup matches:", error);
    return [];
  }
};
