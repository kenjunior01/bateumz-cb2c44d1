import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

// ===== Types =====
export type LeagueFormat =
  | "round_robin"
  | "single_elimination"
  | "double_elimination"
  | "swiss"
  | "battle_royale"
  | "rpg_championship";

export type LeagueStatus = "draft" | "registration" | "active" | "paused" | "completed";
export type MatchStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "bye";
export type GameCategory =
  | "strategy" | "arcade" | "puzzle" | "reflex" | "quiz"
  | "luck" | "social" | "words" | "cards" | "rpg" | "battle_royale" | "typing" | "action";

export interface League {
  id: string;
  region_id?: string;
  creator_id: string;
  business_id?: string;
  name: string;
  slug: string;
  description?: string;
  cover_image_url?: string;
  logo_url?: string;
  format: LeagueFormat;
  status: LeagueStatus;
  game_type: string;
  game_category: GameCategory;
  max_participants: number;
  min_participants: number;
  current_participants: number;
  registration_opens_at?: string;
  registration_closes_at?: string;
  starts_at?: string;
  ends_at?: string;
  wins_needed: number;
  points_per_win: number;
  points_per_draw: number;
  points_per_loss: number;
  prize_pool: number;
  currency: string;
  prize_distribution: number[];
  prize_description?: string;
  rpg_config: Record<string, any>;
  battle_royale_config: Record<string, any>;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  is_public: boolean;
  is_featured: boolean;
  requires_approval: boolean;
  allow_spectating: boolean;
  auto_start: boolean;
  tiebreaker: string;
  created_at: string;
  updated_at: string;
}

export interface LeagueParticipant {
  id: string;
  league_id: string;
  user_id: string;
  display_name?: string;
  avatar_url?: string;
  team_name?: string;
  wins: number;
  losses: number;
  draws: number;
  points: number;
  score_for: number;
  score_against: number;
  rpg_class?: string;
  rpg_level: number;
  rpg_xp: number;
  rpg_kills: number;
  rpg_deaths: number;
  br_wins: number;
  br_avg_placement: number;
  br_total_kills: number;
  status: string;
  seed?: number;
  bracket_position?: number;
  joined_at: string;
  // Joined profile data
  profile?: { display_name?: string; avatar_url?: string };
}

export interface LeagueMatch {
  id: string;
  league_id: string;
  round_number: number;
  match_number: number;
  bracket: string;
  player1_id?: string;
  player2_id?: string;
  player1_display?: string;
  player2_display?: string;
  player1_score: number;
  player2_score: number;
  winner_id?: string;
  loser_id?: string;
  is_draw: boolean;
  status: MatchStatus;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  game_session_id?: string;
  live_code?: string;
  next_match_id?: string;
  metadata: Record<string, any>;
  created_at: string;
  updated_at: string;
  // Joined data
  player1?: LeagueParticipant;
  player2?: LeagueParticipant;
}

export interface LeagueActivity {
  id: string;
  league_id: string;
  user_id?: string;
  type: string;
  title?: string;
  body?: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface LeagueInvitation {
  id: string;
  league_id: string;
  inviter_id: string;
  invitee_id?: string;
  email?: string;
  code: string;
  max_uses: number;
  uses_count: number;
  status: string;
  expires_at?: string;
  created_at: string;
}

export interface CreateLeagueData {
  name: string;
  description?: string;
  format: LeagueFormat;
  game_type: string;
  game_category?: GameCategory;
  max_participants?: number;
  min_participants?: number;
  registration_opens_at?: string;
  registration_closes_at?: string;
  starts_at?: string;
  ends_at?: string;
  wins_needed?: number;
  prize_pool?: number;
  currency?: string;
  prize_description?: string;
  primary_color?: string;
  secondary_color?: string;
  is_public?: boolean;
  requires_approval?: boolean;
  rpg_config?: Record<string, any>;
  battle_royale_config?: Record<string, any>;
}

// ===== Format labels =====
export const FORMAT_LABELS: Record<LeagueFormat, string> = {
  round_robin: "Todos contra Todos",
  single_elimination: "Eliminacao Simples",
  double_elimination: "Eliminacao Dupla",
  swiss: "Sistema Suico",
  battle_royale: "Battle Royale",
  rpg_championship: "Campeonato RPG",
};

export const FORMAT_DESCRIPTIONS: Record<LeagueFormat, string> = {
  round_robin: "Cada jogador enfrenta todos os outros. Classificacao por pontos.",
  single_elimination: "Bracket eliminatorio. Perde uma vez e esta fora!",
  double_elimination: "Dois brackets. Perde no winners, vai para losers. So elimina na segunda derrota.",
  swiss: "Emparceiramento por pontos. Todos jogam o mesmo numero de rondas.",
  battle_royale: "Todos ao mesmo tempo. Ultimo a sobreviver vence a ronda.",
  rpg_championship: "Bracket com classes RPG. Escolha sua classe e lute!",
};

export const GAME_CATEGORY_LABELS: Record<GameCategory, string> = {
  strategy: "Estrategia",
  arcade: "Arcade",
  puzzle: "Puzzle",
  reflex: "Reflexo",
  quiz: "Quiz",
  luck: "Sorte",
  social: "Social",
  words: "Palavras",
  cards: "Cartas",
  rpg: "RPG",
  battle_royale: "Battle Royale",
  typing: "Digitacao",
  action: "Acao",
};

// ===== League CRUD =====
export async function createLeague(data: CreateLeagueData & { creator_id: string; business_id?: string }): Promise<League> {
  const slug = data.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    + "-" + Date.now().toString(36);

  const row = {
    ...data,
    slug,
    game_category: data.game_category || "strategy",
    max_participants: data.max_participants || 16,
    min_participants: data.min_participants || 2,
    wins_needed: data.wins_needed || 1,
    currency: data.currency || "AOA",
    prize_distribution: [50, 30, 20],
    is_public: data.is_public !== false,
    requires_approval: data.requires_approval || false,
  };

  const { data: league, error } = await sb
    .from("leagues")
    .insert(row)
    .select()
    .single();

  if (error) throw error;
  return league as League;
}

export async function updateLeague(id: string, data: Partial<League>): Promise<void> {
  const { error } = await sb.from("leagues").update(data).eq("id", id);
  if (error) throw error;
}

export async function deleteLeague(id: string): Promise<void> {
  const { error } = await sb.from("leagues").delete().eq("id", id);
  if (error) throw error;
}

export async function getLeague(id: string): Promise<League | null> {
  const { data, error } = await sb.from("leagues").select("*").eq("id", id).single();
  if (error) return null;
  return data as League;
}

export async function getLeagueBySlug(slug: string): Promise<League | null> {
  const { data, error } = await sb.from("leagues").select("*").eq("slug", slug).single();
  if (error) return null;
  return data as League;
}

export async function getLeagues(filters?: {
  status?: LeagueStatus;
  format?: LeagueFormat;
  game_type?: string;
  creator_id?: string;
  is_featured?: boolean;
  limit?: number;
}): Promise<League[]> {
  let query = sb.from("leagues").select("*").order("created_at", { ascending: false });

  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.format) query = query.eq("format", filters.format);
  if (filters?.game_type) query = query.eq("game_type", filters.game_type);
  if (filters?.creator_id) query = query.eq("creator_id", filters.creator_id);
  if (filters?.is_featured) query = query.eq("is_featured", true);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as League[];
}

export async function getFeaturedLeagues(): Promise<League[]> {
  return getLeagues({ is_featured: true, status: "active", limit: 10 });
}

// ===== Participants =====
export async function joinLeague(leagueId: string, userId: string, data?: {
  display_name?: string;
  team_name?: string;
  rpg_class?: string;
}): Promise<void> {
  const { error } = await sb.from("league_participants").insert({
    league_id: leagueId,
    user_id: userId,
    ...data,
  });
  if (error) throw error;
}

export async function leaveLeague(leagueId: string, userId: string): Promise<void> {
  const { error } = await sb
    .from("league_participants")
    .delete()
    .eq("league_id", leagueId)
    .eq("user_id", userId);
  if (error) throw error;
}

export async function getLeagueParticipants(leagueId: string): Promise<LeagueParticipant[]> {
  const { data, error } = await sb
    .from("league_participants")
    .select("*")
    .eq("league_id", leagueId)
    .order("points", { ascending: false });
  if (error) throw error;
  return (data || []) as LeagueParticipant[];
}

export async function getParticipant(leagueId: string, userId: string): Promise<LeagueParticipant | null> {
  const { data, error } = await sb
    .from("league_participants")
    .select("*")
    .eq("league_id", leagueId)
    .eq("user_id", userId)
    .single();
  if (error) return null;
  return data as LeagueParticipant;
}

// ===== Matches =====
export async function getLeagueMatches(leagueId: string, round?: number): Promise<LeagueMatch[]> {
  let query = sb
    .from("league_matches")
    .select("*")
    .eq("league_id", leagueId)
    .order("round_number", { ascending: true })
    .order("match_number", { ascending: true });

  if (round !== undefined) query = query.eq("round_number", round);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as LeagueMatch[];
}

export async function createMatch(data: {
  league_id: string;
  round_number: number;
  match_number: number;
  bracket?: string;
  player1_id?: string;
  player2_id?: string;
 player1_display?: string;
  player2_display?: string;
  next_match_id?: string;
  scheduled_at?: string;
}): Promise<LeagueMatch> {
  const { data: match, error } = await sb
    .from("league_matches")
    .insert({
      status: "scheduled",
      ...data,
    })
    .select()
    .single();
  if (error) throw error;
  return match as LeagueMatch;
}

export async function reportMatchResult(
  matchId: string,
  data: {
    player1_score: number;
    player2_score: number;
    winner_id?: string;
    is_draw?: boolean;
    metadata?: Record<string, any>;
  }
): Promise<void> {
  const { error } = await sb
    .from("league_matches")
    .update({
      ...data,
      status: "completed",
      completed_at: new Date().toISOString(),
      loser_id: data.winner_id ? undefined : undefined,
    })
    .eq("id", matchId);
  if (error) throw error;
}

// ===== Bracket Generation =====
export function generateSingleEliminationBracket(
  participants: LeagueParticipant[]
): { matches: Array<{ round: number; match: number; p1?: string; p2?: string; next?: number }> } {
  const count = participants.length;
  const rounds = Math.ceil(Math.log2(count));
  const totalSlots = Math.pow(2, rounds);
  const byes = totalSlots - count;
  const matches: Array<{ round: number; match: number; p1?: string; p2?: string; next?: number }> = [];

  // Shuffle participants for seeding
  const shuffled = [...participants].sort(() => Math.random() - 0.5);
  let matchIdx = 1;

  // Round 1
  let pIdx = 0;
  const round1Count = totalSlots / 2;
  for (let i = 0; i < round1Count; i++) {
    const p1 = pIdx < count ? shuffled[pIdx++].user_id : undefined;
    const p2 = pIdx < count ? shuffled[pIdx++].user_id : undefined;
    matches.push({ round: 1, match: matchIdx++, p1, p2 });
  }

  // Higher rounds
  let currentRoundMatches = round1Count;
  for (let r = 2; r <= rounds; r++) {
 const nextRoundMatches = currentRoundMatches / 2;
    for (let i = 0; i < nextRoundMatches; i++) {
      matches.push({ round: r, match: matchIdx++ });
    }
    currentRoundMatches = nextRoundMatches;
  }

  // Link next_match_id
  for (let r = 1; r < rounds; r++) {
    const roundMatches = matches.filter(m => m.round === r);
    const nextRoundMatches = matches.filter(m => m.round === r + 1);
    for (let i = 0; i < roundMatches.length; i++) {
      roundMatches[i].next = nextRoundMatches[Math.floor(i / 2)].match;
    }
  }

  return { matches };
}

export function generateRoundRobinPairings(
  participantIds: string[]
): Array<{ round: number; match: number; p1: string; p2: string }> {
  const pairings: Array<{ round: number; match: number; p1: string; p2: string }> = [];
  const n = participantIds.length;
  if (n < 2) return pairings;

  const ids = [...participantIds];
  if (n % 2 !== 0) ids.push("bye"); // odd number: one player gets bye each round

  const rounds = ids.length - 1;
  let matchNum = 1;

  for (let r = 0; r < rounds; r++) {
    for (let i = 0; i < ids.length / 2; i++) {
      const p1 = ids[i];
      const p2 = ids[ids.length - 1 - i];
      if (p1 !== "bye" && p2 !== "bye") {
        pairings.push({ round: r + 1, match: matchNum++, p1, p2 });
      }
    }
    // Rotate: fix first, rotate rest
    const last = ids.pop()!;
    ids.splice(1, 0, last);
  }

  return pairings;
}

// ===== Activity Feed =====
export async function addLeagueActivity(
  leagueId: string,
  type: string,
  data: { user_id?: string; title?: string; body?: string; metadata?: Record<string, any> }
): Promise<void> {
  const { error } = await sb.from("league_activity").insert({
    league_id: leagueId,
    ...data,
    type,
  });
  if (error) throw error;
}

export async function getLeagueActivity(leagueId: string, limit: number = 50): Promise<LeagueActivity[]> {
  const { data, error } = await sb
    .from("league_activity")
    .select("*")
    .eq("league_id", leagueId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []) as LeagueActivity[];
}

// ===== Invitations =====
export async function createInvitation(
  leagueId: string,
  inviterId: string,
  data?: { invitee_id?: string; email?: string; max_uses?: number; expires_at?: string }
): Promise<LeagueInvitation> {
  const code = Math.random().toString(36).substring(2, 10).toUpperCase();
  const { data: invite, error } = await sb
    .from("league_invitations")
    .insert({
      league_id: leagueId,
      inviter_id: inviterId,
      code,
      max_uses: data?.max_uses || 1,
      expires_at: data?.expires_at,
      invitee_id: data?.invitee_id,
      email: data?.email,
    })
    .select()
    .single();
  if (error) throw error;
  return invite as LeagueInvitation;
}

export async function acceptInvitation(code: string, userId: string): Promise<{ leagueId: string } | null> {
  const { data: invite } = await sb
    .from("league_invitations")
    .select("*")
    .eq("code", code)
    .eq("status", "pending")
    .single();

  if (!invite) return null;
  if (invite.expires_at && new Date(invite.expires_at) < new Date()) return null;
  if (invite.uses_count >= invite.max_uses) return null;

  await sb
    .from("league_invitations")
    .update({ status: "accepted", uses_count: invite.uses_count + 1 })
    .eq("id", invite.id);

  return { leagueId: invite.league_id };
}

// ===== League Status Management =====
export async function startLeague(leagueId: string): Promise<void> {
  await sb
    .from("leagues")
    .update({ status: "active", starts_at: new Date().toISOString() })
    .eq("id", leagueId);
}

export async function pauseLeague(leagueId: string): Promise<void> {
  await sb
    .from("leagues")
    .update({ status: "paused" })
    .eq("id", leagueId);
}

export async function completeLeague(leagueId: string): Promise<void> {
  await sb
    .from("leagues")
    .update({ status: "completed", ends_at: new Date().toISOString() })
    .eq("id", leagueId);
}

export async function openRegistration(leagueId: string): Promise<void> {
  await sb
    .from("leagues")
    .update({ status: "registration" })
    .eq("id", leagueId);
}
