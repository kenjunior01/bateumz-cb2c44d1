import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

// ===== Types =====
export type TournamentStatus = "draft" | "active" | "completed";

export interface Tournament {
  id: string;
  business_id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  status: TournamentStatus;
  prize_description?: string;
  prize_value?: number;
  currency?: string;
  max_participants?: number;
  rules?: string;
  created_at: string;
}

export interface TournamentStanding {
  id: string;
  tournament_id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  total_points: number;
  games_played: number;
  wins: number;
  rank?: number;
  updated_at: string;
}

export interface TournamentMatch {
  id: string;
  tournament_id: string;
  live_code: string;
  game_type: string;
  played_at: string;
}

// ===== Functions =====
export async function createTournament(
  data: Omit<Tournament, "id" | "created_at">
): Promise<Tournament> {
  const { data: row, error } = await sb
    .from("tournaments")
    .insert(data as any)
    .select()
    .single();
  if (error) throw error;
  return row as Tournament;
}

export async function getTournaments(
  status?: TournamentStatus
): Promise<Tournament[]> {
  let query = sb
    .from("tournaments")
    .select("*")
    .order("created_at", { ascending: false });

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as Tournament[];
}

export async function getTournamentById(id: string): Promise<Tournament | null> {
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("id", id)
    .single();
  if (error) return null;
  return data as Tournament;
}

export async function getTournamentStandings(
  tournamentId: string
): Promise<TournamentStanding[]> {
  const { data, error } = await sb
    .from("tournament_standings")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("total_points", { ascending: false })
    .order("wins", { ascending: false });
  if (error) throw error;
  return (data ?? []) as TournamentStanding[];
}

export async function addTournamentPoints(
  tournamentId: string,
  userId: string,
  points: number,
  wins: 0 | 1 = 0
): Promise<void> {
  // Upsert: insert or add points to existing standing
  const { error } = await sb.rpc("add_tournament_points", {
    p_tournament_id: tournamentId,
    p_user_id: userId,
    p_points: points,
    p_wins: wins,
  });
  if (error) {
    // Fallback: fetch existing and update manually
    const { data: existing } = await sb
      .from("tournament_standings")
      .select("*")
      .eq("tournament_id", tournamentId)
      .eq("user_id", userId)
      .single();

    if (existing) {
      await sb
        .from("tournament_standings")
        .update({
          total_points: (existing.total_points ?? 0) + points,
          wins: (existing.wins ?? 0) + wins,
          games_played: (existing.games_played ?? 0) + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existing.id);
    } else {
      await sb.from("tournament_standings").insert({
        tournament_id: tournamentId,
        user_id: userId,
        total_points: points,
        wins,
        games_played: 1,
      });
    }
  }
}

export async function getActiveTournament(): Promise<Tournament | null> {
  const now = new Date().toISOString();
  const { data, error } = await sb
    .from("tournaments")
    .select("*")
    .eq("status", "active")
    .gte("end_date", now)
    .lte("start_date", now)
    .order("start_date", { ascending: false })
    .limit(1)
    .single();
  if (error) return null;
  return data as Tournament;
}

export async function updateTournamentStatus(
  id: string,
  status: TournamentStatus
): Promise<void> {
  const { error } = await sb
    .from("tournaments")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}

export async function getTournamentParticipantCount(
  tournamentId: string
): Promise<number> {
  const { count, error } = await sb
    .from("tournament_standings")
    .select("*", { count: "exact", head: true })
    .eq("tournament_id", tournamentId);
  if (error) throw error;
  return count ?? 0;
}
