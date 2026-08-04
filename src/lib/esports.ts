import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

// ============================================================
// ENUM-LIKE TYPES
// ============================================================

export type MatchFormat = "solo" | "duo" | "squad" | "5v5" | "3v3" | "2v2" | "1v1";
export type Platform = "mobile" | "pc" | "console" | "crossplay";
export type RegionServer = "br" | "na" | "eu" | "asia" | "latam";
export type VerificationMethod = "screenshot" | "replay" | "stream" | "admin" | "auto";
export type ChampStatus =
  | "draft"
  | "registration_open"
  | "registration_closed"
  | "check_in"
  | "live"
  | "completed"
  | "cancelled";
export type MatchResultStatus = "pending" | "in_progress" | "completed" | "disputed" | "cancelled";
export type TournamentFormat = "single_elim" | "double_elim" | "round_robin" | "swiss" | "battle_royale";

// ============================================================
// DB ENTITY TYPES
// ============================================================

export interface EsportGame {
  id: string;
  name: string;
  slug: string;
  icon_url: string | null;
  cover_url: string | null;
  developer: string | null;
  publisher: string | null;
  genre: string | null;
  platform: Platform | null;
  is_active: boolean;
  is_featured: boolean;
  max_team_size: number;
  has_solo: boolean;
  has_duo: boolean;
  has_squad: boolean;
  default_scoring: string | null;
  scoring_description: string | null;
  verification_methods: VerificationMethod[];
  region_servers: RegionServer[];
  rules_template: string | null;
  meta: Record<string, any> | null;
  sort_order: number;
  created_at: string;
}

export interface EsportTeam {
  id: string;
  name: string;
  slug: string;
  tag: string | null;
  logo_url: string | null;
  banner_url: string | null;
  description: string | null;
  country: string | null;
  region: string | null;
  discord_url: string | null;
  social_links: Record<string, string> | null;
  owner_id: string;
  is_verified: boolean;
  is_public: boolean;
  total_wins: number;
  total_losses: number;
  total_tournaments: number;
  total_earnings: number;
  rating: number;
  created_at: string;
  updated_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  game_username: string | null;
  game_uid: string | null;
  is_active: boolean;
  joined_at: string;
}

export interface Championship {
  id: string;
  region_id: string | null;
  creator_id: string;
  business_id: string | null;
  name: string;
  slug: string;
  description: string | null;
  cover_image_url: string | null;
  logo_url: string | null;
  game_id: string;
  match_format: MatchFormat;
  platform: Platform | null;
  status: ChampStatus;
  is_published: boolean;
  is_featured: boolean;
  is_public: boolean;
  max_teams: number;
  min_teams: number;
  max_players_per_team: number;
  registered_teams: number;
  registered_players: number;
  registration_opens_at: string | null;
  registration_closes_at: string | null;
  check_in_opens_at: string | null;
  check_in_closes_at: string | null;
  starts_at: string | null;
  ends_at: string | null;
  tournament_format: TournamentFormat;
  total_rounds: number;
  best_of: number;
  games_per_match: number;
  points_per_kill: number;
  points_per_placement: Record<number, number> | null;
  prize_pool: number;
  currency: string;
  prize_distribution: Record<string, number> | null;
  prize_description: string | null;
  prize_image_url: string | null;
  sponsorship_banners: string[] | null;
  custom_rules: string | null;
  map_pool: string[] | null;
  mode_config: Record<string, any> | null;
  verification_method: VerificationMethod | null;
  stream_url: string | null;
  stream_platform: string | null;
  stream_embed_url: string | null;
  secondary_stream_url: string | null;
  region_server: RegionServer | null;
  primary_color: string | null;
  secondary_color: string | null;
  accent_color: string | null;
  allow_spectating: boolean;
  allow_predictions: boolean;
  allow_trash_talk: boolean;
  require_team: boolean;
  auto_bracket: boolean;
  show_replays: boolean;
  total_matches: number;
  total_viewers: number;
  created_at: string;
  updated_at: string;
}

export interface ChampTeam {
  id: string;
  championship_id: string;
  team_id: string | null;
  player_id: string | null;
  player_name: string | null;
  player_username: string | null;
  player_avatar: string | null;
  seed: number | null;
  bracket_position: number | null;
  is_checked_in: boolean;
  status: string;
  placement: number | null;
  total_points: number;
  total_kills: number;
  total_deaths: number;
  matches_played: number;
  matches_won: number;
  matches_lost: number;
  prize_won: number | null;
  registered_at: string;
}

export interface EsportMatch {
  id: string;
  championship_id: string;
  round_number: number;
  match_number: number;
  bracket: string | null;
  group_letter: string | null;
  team1_id: string | null;
  team2_id: string | null;
  team1_name: string | null;
  team2_name: string | null;
  team1_logo: string | null;
  team2_logo: string | null;
  room_teams: Record<string, any>[] | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  loser_id: string | null;
  is_draw: boolean;
  mvp_player_id: string | null;
  mvp_player_name: string | null;
  status: MatchResultStatus;
  result_status: MatchResultStatus | null;
  scheduled_at: string | null;
  started_at: string | null;
  completed_at: string | null;
  lobby_id: string | null;
  lobby_password: string | null;
  map_name: string | null;
  mode_name: string | null;
  verification_method: VerificationMethod | null;
  team1_screenshot_url: string | null;
  team2_screenshot_url: string | null;
  replay_url: string | null;
  stream_clip_url: string | null;
  admin_notes: string | null;
  dispute_reason: string | null;
  disputed_by: string | null;
  next_match_id: string | null;
  previous_match1_id: string | null;
  previous_match2_id: string | null;
  viewer_count: number;
  meta: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface MatchPlacement {
  id: string;
  match_id: string;
  champ_team_id: string;
  team_name: string;
  placement: number;
  kills: number;
  deaths: number;
  damage_dealt: number;
  points: number;
  meta: Record<string, any> | null;
  created_at: string;
}

export interface Prediction {
  id: string;
  match_id: string;
  user_id: string;
  predicted_winner_id: string;
  points_wagered: number;
  is_correct: boolean | null;
  points_won: number | null;
 resolved_at: string | null;
  created_at: string;
}

export interface EsportActivity {
  id: string;
  championship_id: string;
  user_id: string | null;
  type: string;
  title: string;
  description: string | null;
 meta: Record<string, any> | null;
 created_at: string;
}

export interface MvpVote {
  id: string;
  match_id: string;
  voter_id: string;
  candidate_id: string;
  candidate_name: string | null;
  created_at: string;
}

export interface Report {
  id: string;
  championship_id: string | null;
  match_id: string | null;
  reporter_id: string;
  reported_user_id: string | null;
  reason: string;
  description: string | null;
 evidence_url: string | null;
 status: string;
 admin_notes: string | null;
 resolved_by: string | null;
 resolved_at: string | null;
  created_at: string;
}

// ============================================================
// CONSTANTS
// ============================================================

export const FORMAT_LABELS: Record<MatchFormat, string> = {
  solo: "Solo",
  duo: "Dueto",
  squad: "Esquadra",
  "5v5": "5 vs 5",
  "3v3": "3 vs 3",
  "2v2": "2 vs 2",
  "1v1": "1 vs 1",
};

export const PLATFORM_LABELS: Record<Platform, string> = {
  mobile: "Mobile",
  pc: "PC",
  console: "Console",
  crossplay: "Crossplay",
};

export const GENRE_LABELS: Record<string, string> = {
  FPS: "Tiro em Primeira Pessoa",
  "Battle Royale": "Battle Royale",
  MOBA: "MOBA",
  Fighting: "Luta",
  Sports: "Esportes",
  Racing: "Corrida",
  Strategy: "Estrategia",
  Action: "Acao",
};

export const STATUS_LABELS: Record<ChampStatus, string> = {
  draft: "Rascunho",
  registration_open: "Inscricoes Abertas",
  registration_closed: "Inscricoes Encerradas",
  check_in: "Check-in",
  live: "Ao Vivo",
  completed: "Finalizado",
  cancelled: "Cancelado",
};

export const TOURNAMENT_FORMAT_LABELS: Record<TournamentFormat, string> = {
  single_elim: "Eliminacao Simples",
  double_elim: "Eliminacao Dupla",
  round_robin: "Todos contra Todos",
  swiss: "Sistema Suico",
  battle_royale: "Battle Royale",
};

export const VERIFICATION_LABELS: Record<VerificationMethod, string> = {
  screenshot: "Print de Tela",
  replay: "Replay",
  stream: "Transmissao",
  admin: "Administrador",
  auto: "Automatico",
};

export const DEFAULT_BR_PLACEMENT_POINTS: Record<number, number> = {
  1: 15,
  2: 12,
  3: 10,
  4: 8,
  5: 6,
  6: 5,
  7: 4,
  8: 3,
  9: 2,
  10: 1,
  11: 1,
  12: 1,
};

export const GAME_EMOJIS: Record<string, string> = {
  "free-fire": "\uD83D\uDD25",
  codm: "\uD83C\uDFAF",
  pubgm: "\uD83C\uDFAF",
  valorant: "\u26A1",
  fortnite: "\uD83C\uDFD7\uFE0F",
  cs2: "\uD83D\uDD2B",
  league: "\u2694\uFE0F",
  dota2: "\uD83D\uDC0D",
  apex: "\uD83D\uDE80",
  wild_rift: "\uD83C\uDFC6",
  mlbb: "\uD83D\uDCDC",
  clash_royale: "\uD83C\uDCCF",
  fifa: "\u26BD",
  rocket_league: "\uD83D\uDE80",
};

// ============================================================
// UTILITY
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

// ============================================================
// GAMES
// ============================================================

export async function getEsportGames(filters?: {
  is_featured?: boolean;
  genre?: string;
  platform?: Platform;
}): Promise<EsportGame[]> {
  let query = sb.from("esport_games").select("*").eq("is_active", true).order("sort_order");
  if (filters?.is_featured !== undefined) query = query.eq("is_featured", filters.is_featured);
  if (filters?.genre) query = query.eq("genre", filters.genre);
  if (filters?.platform) query = query.eq("platform", filters.platform);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar jogos: ${error.message}`);
  return (data ?? []) as EsportGame[];
}

export async function getEsportGame(id: string): Promise<EsportGame | null> {
  const { data, error } = await sb.from("esport_games").select("*").eq("id", id).single();
  if (error) throw new Error(`Erro ao buscar jogo: ${error.message}`);
  return data as EsportGame | null;
}

export async function getEsportGameBySlug(slug: string): Promise<EsportGame | null> {
  const { data, error } = await sb.from("esport_games").select("*").eq("slug", slug).single();
  if (error) throw new Error(`Erro ao buscar jogo pelo slug: ${error.message}`);
  return data as EsportGame | null;
}

// ============================================================
// TEAMS
// ============================================================

export async function createTeam(data: {
  name: string;
  tag?: string;
  logo_url?: string;
  banner_url?: string;
  description?: string;
  country?: string;
  region?: string;
  discord_url?: string;
  social_links?: Record<string, string>;
  owner_id: string;
}): Promise<EsportTeam> {
  const payload = {
    ...data,
    slug: slugify(data.name),
    is_verified: false,
    is_public: true,
    total_wins: 0,
    total_losses: 0,
    total_tournaments: 0,
    total_earnings: 0,
    rating: 1000,
  created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_teams").insert(payload).select().single();
  if (error) throw new Error(`Erro ao criar time: ${error.message}`);
  return row as EsportTeam;
}

export async function updateTeam(id: string, data: Partial<EsportTeam>): Promise<EsportTeam> {
  const { data: row, error } = await sb.from("esport_teams").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw new Error(`Erro ao atualizar time: ${error.message}`);
  return row as EsportTeam;
}

export async function getTeam(id: string): Promise<EsportTeam | null> {
  const { data, error } = await sb.from("esport_teams").select("*").eq("id", id).single();
  if (error) throw new Error(`Erro ao buscar time: ${error.message}`);
  return data as EsportTeam | null;
}

export async function getTeams(filters?: {
  search?: string;
  country?: string;
  region?: string;
  is_verified?: boolean;
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_dir?: "asc" | "desc";
}): Promise<EsportTeam[]> {
  let query = sb.from("esport_teams").select("*");
  if (filters?.search) query = query.ilike("name", `%${filters.search}%`);
  if (filters?.country) query = query.eq("country", filters.country);
  if (filters?.region) query = query.eq("region", filters.region);
  if (filters?.is_verified !== undefined) query = query.eq("is_verified", filters.is_verified);
  const sortField = filters?.sort_by ?? "rating";
  const sortDir = filters?.sort_dir ?? "desc";
  query = query.order(sortField, { ascending: sortDir === "asc" });
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar times: ${error.message}`);
  return (data ?? []) as EsportTeam[];
}

export async function getTeamMembers(teamId: string): Promise<TeamMember[]> {
  const { data, error } = await sb.from("esport_team_members").select("*").eq("team_id", teamId).eq("is_active", true).order("joined_at");
  if (error) throw new Error(`Erro ao buscar membros do time: ${error.message}`);
  return (data ?? []) as TeamMember[];
}

export async function addTeamMember(teamId: string, data: {
  user_id: string;
  role?: string;
  game_username?: string;
  game_uid?: string;
}): Promise<TeamMember> {
  const payload = {
    team_id: teamId,
    user_id: data.user_id,
    role: data.role ?? "membro",
    game_username: data.game_username ?? null,
    game_uid: data.game_uid ?? null,
    is_active: true,
    joined_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_team_members").insert(payload).select().single();
  if (error) throw new Error(`Erro ao adicionar membro: ${error.message}`);
  return row as TeamMember;
}

export async function removeTeamMember(teamId: string, userId: string): Promise<void> {
  const { error } = await sb.from("esport_team_members").update({ is_active: false }).eq("team_id", teamId).eq("user_id", userId);
  if (error) throw new Error(`Erro ao remover membro: ${error.message}`);
}

export async function updateTeamMemberRole(memberId: string, role: string): Promise<TeamMember> {
  const { data: row, error } = await sb.from("esport_team_members").update({ role }).eq("id", memberId).select().single();
  if (error) throw new Error(`Erro ao atualizar cargo do membro: ${error.message}`);
  return row as TeamMember;
}

// ============================================================
// CHAMPIONSHIPS
// ============================================================

export async function createChampionship(data: Omit<Championship, "id" | "slug" | "registered_teams" | "registered_players" | "total_matches" | "total_viewers" | "created_at" | "updated_at">): Promise<Championship> {
  const slug = slugify(data.name) + "-" + Date.now().toString(36);
  const payload = {
    ...data,
    slug,
    registered_teams: 0,
    registered_players: 0,
    total_matches: 0,
    total_viewers: 0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_championships").insert(payload).select().single();
  if (error) throw new Error(`Erro ao criar campeonato: ${error.message}`);
  return row as Championship;
}

export async function updateChampionship(id: string, data: Partial<Championship>): Promise<Championship> {
  const { data: row, error } = await sb.from("esport_championships").update({ ...data, updated_at: new Date().toISOString() }).eq("id", id).select().single();
  if (error) throw new Error(`Erro ao atualizar campeonato: ${error.message}`);
  return row as Championship;
}

export async function getChampionship(id: string): Promise<Championship | null> {
  const { data, error } = await sb.from("esport_championships").select("*").eq("id", id).single();
  if (error) throw new Error(`Erro ao buscar campeonato: ${error.message}`);
  return data as Championship | null;
}

export async function getChampionshipBySlug(slug: string): Promise<Championship | null> {
  const { data, error } = await sb.from("esport_championships").select("*").eq("slug", slug).single();
  if (error) throw new Error(`Erro ao buscar campeonato pelo slug: ${error.message}`);
  return data as Championship | null;
}

export async function getChampionships(filters?: {
  status?: ChampStatus;
  game_id?: string;
  is_featured?: boolean;
  is_published?: boolean;
  region_id?: string;
  creator_id?: string;
  limit?: number;
  offset?: number;
}): Promise<Championship[]> {
  let query = sb.from("esport_championships").select("*").order("created_at", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.game_id) query = query.eq("game_id", filters.game_id);
  if (filters?.is_featured !== undefined) query = query.eq("is_featured", filters.is_featured);
  if (filters?.is_published !== undefined) query = query.eq("is_published", filters.is_published);
  if (filters?.region_id) query = query.eq("region_id", filters.region_id);
  if (filters?.creator_id) query = query.eq("creator_id", filters.creator_id);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, filters.offset + (filters.limit ?? 20) - 1);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar campeonatos: ${error.message}`);
  return (data ?? []) as Championship[];
}

export async function getFeaturedChampionships(): Promise<Championship[]> {
  const { data, error } = await sb
    .from("esport_championships")
    .select("*")
    .eq("is_featured", true)
    .eq("is_published", true)
    .in("status", ["registration_open", "check_in", "live"])
    .order("starts_at", { ascending: true })
    .limit(10);
  if (error) throw new Error(`Erro ao buscar campeonatos em destaque: ${error.message}`);
  return (data ?? []) as Championship[];
}

export async function updateChampionshipStatus(id: string, status: ChampStatus): Promise<Championship> {
  const { data: row, error } = await sb
    .from("esport_championships")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar status do campeonato: ${error.message}`);
  return row as Championship;
}

// ============================================================
// CHAMP TEAMS (Registration)
// ============================================================

export async function registerTeam(champId: string, data: {
  team_id: string;
  seed?: number;
}): Promise<ChampTeam> {
  const { data: team } = await sb.from("esport_teams").select("name,logo_url").eq("id", data.team_id).single();
  const payload = {
    championship_id: champId,
    team_id: data.team_id,
    player_id: null,
    player_name: team?.name ?? null,
    player_username: null,
    player_avatar: team?.logo_url ?? null,
    seed: data.seed ?? null,
    bracket_position: null,
    is_checked_in: false,
    status: "registered",
    placement: null,
    total_points: 0,
    total_kills: 0,
    total_deaths: 0,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    prize_won: null,
    registered_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_champ_teams").insert(payload).select().single();
  if (error) throw new Error(`Erro ao inscrever time: ${error.message}`);
  await sb.from("esport_championships").update({ registered_teams: sb.raw("registered_teams + 1") }).eq("id", champId);
  return row as ChampTeam;
}

export async function registerSoloPlayer(champId: string, data: {
  player_id: string;
  player_name: string;
  player_username?: string;
  player_avatar?: string;
}): Promise<ChampTeam> {
  const payload = {
    championship_id: champId,
    team_id: null,
    player_id: data.player_id,
    player_name: data.player_name,
    player_username: data.player_username ?? null,
    player_avatar: data.player_avatar ?? null,
    seed: null,
    bracket_position: null,
    is_checked_in: false,
    status: "registered",
    placement: null,
    total_points: 0,
    total_kills: 0,
    total_deaths: 0,
    matches_played: 0,
    matches_won: 0,
    matches_lost: 0,
    prize_won: null,
    registered_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_champ_teams").insert(payload).select().single();
  if (error) throw new Error(`Erro ao inscrever jogador solo: ${error.message}`);
  await sb.from("esport_championships").update({ registered_players: sb.raw("registered_players + 1") }).eq("id", champId);
  return row as ChampTeam;
}

export async function checkIn(champTeamId: string): Promise<ChampTeam> {
  const { data: row, error } = await sb
    .from("esport_champ_teams")
    .update({ is_checked_in: true, status: "checked_in" })
    .eq("id", champTeamId)
    .select()
    .single();
  if (error) throw new Error(`Erro ao realizar check-in: ${error.message}`);
  return row as ChampTeam;
}

export async function withdrawTeam(champTeamId: string): Promise<void> {
  const { data: ct } = await sb.from("esport_champ_teams").select("championship_id").eq("id", champTeamId).single();
  const { error } = await sb.from("esport_champ_teams").update({ status: "withdrawn" }).eq("id", champTeamId);
  if (error) throw new Error(`Erro ao retirar inscricao: ${error.message}`);
  if (ct) {
    await sb.from("esport_championships").update({ registered_teams: sb.raw("GREATEST(registered_teams - 1, 0)") }).eq("id", ct.championship_id);
  }
}

export async function getChampTeams(champId: string): Promise<ChampTeam[]> {
  const { data, error } = await sb.from("esport_champ_teams").select("*").eq("championship_id", champId).order("seed");
  if (error) throw new Error(`Erro ao buscar times do campeonato: ${error.message}`);
  return (data ?? []) as ChampTeam[];
}

export async function getChampStandings(champId: string): Promise<ChampTeam[]> {
  const { data, error } = await sb
    .from("esport_champ_teams")
    .select("*")
    .eq("championship_id", champId)
    .neq("status", "withdrawn")
    .order("total_points", { ascending: false })
    .order("total_kills", { ascending: false });
  if (error) throw new Error(`Erro ao buscar classificacao: ${error.message}`);
  return (data ?? []) as ChampTeam[];
}

// ============================================================
// MATCHES
// ============================================================

export async function getChampMatches(champId: string, round?: number): Promise<EsportMatch[]> {
  let query = sb.from("esport_matches").select("*").eq("championship_id", champId).order("round_number").order("match_number");
  if (round !== undefined) query = query.eq("round_number", round);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar partidas: ${error.message}`);
  return (data ?? []) as EsportMatch[];
}

export async function createMatch(data: Omit<EsportMatch, "id" | "created_at" | "updated_at">): Promise<EsportMatch> {
  const payload = { ...data, created_at: new Date().toISOString(), updated_at: new Date().toISOString() };
  const { data: row, error } = await sb.from("esport_matches").insert(payload).select().single();
  if (error) throw new Error(`Erro ao criar partida: ${error.message}`);
  return row as EsportMatch;
}

export async function reportMatchResult(matchId: string, data: {
  team1_score?: number;
  team2_score?: number;
  winner_id?: string | null;
  loser_id?: string | null;
  is_draw?: boolean;
  team1_screenshot_url?: string;
  team2_screenshot_url?: string;
  replay_url?: string;
  completed_at?: string;
}): Promise<EsportMatch> {
  const payload = {
    ...data,
    status: "completed" as MatchResultStatus,
    result_status: "completed" as MatchResultStatus,
    updated_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_matches").update(payload).eq("id", matchId).select().single();
  if (error) throw new Error(`Erro ao reportar resultado: ${error.message}`);
  return row as EsportMatch;
}

export async function updateMatchStatus(matchId: string, status: MatchResultStatus): Promise<EsportMatch> {
  const { data: row, error } = await sb
    .from("esport_matches")
    .update({ status, result_status: status, updated_at: new Date().toISOString() })
    .eq("id", matchId)
    .select()
    .single();
  if (error) throw new Error(`Erro ao atualizar status da partida: ${error.message}`);
  return row as EsportMatch;
}

export async function getMatch(id: string): Promise<EsportMatch | null> {
  const { data, error } = await sb.from("esport_matches").select("*").eq("id", id).single();
  if (error) throw new Error(`Erro ao buscar partida: ${error.message}`);
  return data as EsportMatch | null;
}

// ============================================================
// BRACKET GENERATION
// ============================================================

export interface BracketMatch {
  id: string;
  match_number: number;
  p1: string | null;
  p2: string | null;
  p1_name: string | null;
  p2_name: string | null;
  p1_logo: string | null;
  p2_logo: string | null;
  winner: string | null;
  score1: number | null;
  score2: number | null;
  next_match: string | null;
}

export interface BracketRound {
  round: number;
  label: string;
  matches: BracketMatch[];
}

export interface BracketTree {
  format: TournamentFormat;
  rounds: BracketRound[];
}

const ROUND_LABELS: Record<number, string> = {
  1: "Rodada 1",
  2: "Oitavas de Final",
  3: "Quartas de Final",
  4: "Semifinal",
  5: "Final",
};

function roundLabel(totalRounds: number, currentRound: number): string {
  const offset = totalRounds - currentRound;
  if (offset === 0) return "Final";
  if (offset === 1) return "Semifinal";
  if (offset === 2) return "Quartas de Final";
  if (offset === 3) return "Oitavas de Final";
  return `Rodada ${currentRound}`;
}

export function generateBracket(
  teams: Array<{ id: string; name: string; logo_url?: string | null; seed?: number | null }>,
  format: TournamentFormat,
  totalRounds: number
): BracketTree {
  if (format === "round_robin") {
    return generateRoundRobin(teams, totalRounds);
  }
  if (format === "battle_royale") {
    return generateBRRounds(teams, totalRounds);
  }
  return generateElimination(teams, format, totalRounds);
}

function generateElimination(
  teams: Array<{ id: string; name: string; logo_url?: string | null; seed?: number | null }>,
  format: TournamentFormat,
  totalRounds: number
): BracketTree {
  const rounds: BracketRound[] = [];
  let matchCounter = 1;
  const matchIdMap = new Map<string, string>();

  // Build rounds from first to last
  for (let r = 1; r <= totalRounds; r++) {
    const matchesInRound = Math.ceil(teams.length / Math.pow(2, r));
 const roundMatches: BracketMatch[] = [];
    for (let m = 0; m < matchesInRound; m++) {
      const matchId = `bracket-${r}-${m + 1}`;
      const bracketMatch: BracketMatch = {
        id: matchId,
        match_number: matchCounter++,
        p1: null,
        p2: null,
        p1_name: null,
        p2_name: null,
        p1_logo: null,
        p2_logo: null,
        winner: null,
        score1: null,
        score2: null,
        next_match: null,
      };

      // First round: seed teams
      if (r === 1) {
        const idx1 = m * 2;
        const idx2 = m * 2 + 1;
        if (idx1 < teams.length) {
          bracketMatch.p1 = teams[idx1].id;
          bracketMatch.p1_name = teams[idx1].name;
          bracketMatch.p1_logo = teams[idx1].logo_url ?? null;
        }
        if (idx2 < teams.length) {
          bracketMatch.p2 = teams[idx2].id;
          bracketMatch.p2_name = teams[idx2].name;
          bracketMatch.p2_logo = teams[idx2].logo_url ?? null;
        }
      }

      roundMatches.push(bracketMatch);
      matchIdMap.set(`${r}-${m}`, matchId);
    }
    rounds.push({ round: r, label: roundLabel(totalRounds, r), matches: roundMatches });
  }

  // Wire next_match pointers
  for (let r = 1; r < totalRounds; r++) {
    const currentMatches = rounds[r - 1].matches;
    const nextMatches = rounds[r].matches;
    for (let i = 0; i < currentMatches.length; i++) {
      const nextIdx = Math.floor(i / 2);
      if (nextIdx < nextMatches.length) {
        currentMatches[i].next_match = nextMatches[nextIdx].id;
      }
    }
  }

  return { format, rounds };
}

function generateRoundRobin(
  teams: Array<{ id: string; name: string; logo_url?: string | null; seed?: number | null }>,
  _totalRounds: number
): BracketTree {
  const rounds: BracketRound[] = [];
  const n = teams.length;
  if (n < 2) return { format: "round_robin", rounds: [] };

  // Standard round-robin algorithm
  const list = [...teams];
  if (n % 2 !== 0) list.push({ id: "bye", name: "Bye", logo_url: null });
  const fixed = list[0];
  const rotating = list.slice(1);
  const totalRounds = rotating.length;
  let matchCounter = 1;

  for (let r = 0; r < totalRounds; r++) {
    const roundMatches: BracketMatch[] = [];
    const current = [fixed, ...rotating];
    const half = current.length / 2;
    for (let i = 0; i < half; i++) {
      const t1 = current[i];
      const t2 = current[current.length - 1 - i];
      roundMatches.push({
        id: `rr-r${r + 1}-m${i + 1}`,
        match_number: matchCounter++,
        p1: t1.id === "bye" ? null : t1.id,
        p2: t2.id === "bye" ? null : t2.id,
        p1_name: t1.id === "bye" ? null : t1.name,
        p2_name: t2.id === "bye" ? null : t2.name,
        p1_logo: t1.logo_url ?? null,
        p2_logo: t2.logo_url ?? null,
        winner: null,
        score1: null,
        score2: null,
        next_match: null,
      });
    }
    rounds.push({ round: r + 1, label: `Rodada ${r + 1}`, matches: roundMatches });
    // Rotate
    rotating.push(rotating.shift()!);
  }

  return { format: "round_robin", rounds };
}

function generateBRRounds(
  teams: Array<{ id: string; name: string; logo_url?: string | null; seed?: number | null }>,
  totalRounds: number
): BracketTree {
  const rounds: BracketRound[] = [];
  let matchCounter = 1;

  for (let r = 1; r <= totalRounds; r++) {
    const roundMatches: BracketMatch[] = [];
    // In BR, each round is a single match/lobby with all teams
    roundMatches.push({
      id: `br-r${r}-m1`,
      match_number: matchCounter++,
      p1: null,
      p2: null,
      p1_name: null,
      p2_name: null,
      p1_logo: null,
      p2_logo: null,
      winner: null,
      score1: null,
      score2: null,
      next_match: r < totalRounds ? `br-r${r + 1}-m1` : null,
    });
    rounds.push({ round: r, label: `Partida ${r} de ${totalRounds}`, matches: roundMatches });
  }

  return { format: "battle_royale", rounds };
}

// ============================================================
// MATCH PLACEMENTS (BR Games)
// ============================================================

export async function submitPlacements(
  matchId: string,
  placements: Array<{
    champ_team_id: string;
    team_name: string;
    placement: number;
    kills: number;
    deaths: number;
    damage_dealt: number;
  }>,
  pointsPerPlacement?: Record<number, number>,
  pointsPerKill?: number
): Promise<MatchPlacement[]> {
  const scoringTable = pointsPerPlacement ?? DEFAULT_BR_PLACEMENT_POINTS;
  const killPoints = pointsPerKill ?? 0;

  const rows = placements.map((p) => ({
    match_id: matchId,
    champ_team_id: p.champ_team_id,
    team_name: p.team_name,
    placement: p.placement,
    kills: p.kills,
    deaths: p.deaths,
    damage_dealt: p.damage_dealt,
    points: (scoringTable[p.placement] ?? 0) + p.kills * killPoints,
    created_at: new Date().toISOString(),
  }));

  const { data, error } = await sb.from("esport_match_placements").insert(rows).select();
  if (error) throw new Error(`Erro ao enviar colocacoes: ${error.message}`);

  // Update champ_team totals
  for (const p of placements) {
    const pts = (scoringTable[p.placement] ?? 0) + p.kills * killPoints;
    await sb
      .from("esport_champ_teams")
      .update({
        total_points: sb.raw(`total_points + ${pts}`),
        total_kills: sb.raw(`total_kills + ${p.kills}`),
        total_deaths: sb.raw(`total_deaths + ${p.deaths}`),
        matches_played: sb.raw("matches_played + 1"),
      })
      .eq("id", p.champ_team_id);
  }

  return (data ?? []) as MatchPlacement[];
}

export async function getMatchPlacements(matchId: string): Promise<MatchPlacement[]> {
  const { data, error } = await sb.from("esport_match_placements").select("*").eq("match_id", matchId).order("placement");
  if (error) throw new Error(`Erro ao buscar colocacoes: ${error.message}`);
  return (data ?? []) as MatchPlacement[];
}

// ============================================================
// PREDICTIONS
// ============================================================

export async function makePrediction(
  matchId: string,
  userId: string,
  predictedWinnerId: string,
  pointsWagered: number
): Promise<Prediction> {
  const payload = {
    match_id: matchId,
    user_id: userId,
    predicted_winner_id: predictedWinnerId,
    points_wagered: pointsWagered,
    is_correct: null,
    points_won: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_predictions").insert(payload).select().single();
  if (error) throw new Error(`Erro ao fazer palpite: ${error.message}`);
  return row as Prediction;
}

export async function getMatchPredictions(matchId: string): Promise<Prediction[]> {
  const { data, error } = await sb.from("esport_predictions").select("*").eq("match_id", matchId).order("created_at", { ascending: false });
  if (error) throw new Error(`Erro ao buscar palpites: ${error.message}`);
  return (data ?? []) as Prediction[];
}

export async function resolvePredictions(matchId: string, actualWinnerId: string): Promise<void> {
  const { data: predictions } = await sb.from("esport_predictions").select("*").eq("match_id", matchId).eq("is_correct", null);
  if (!predictions || predictions.length === 0) return;

  const updates = predictions.map((p: any) => {
    const correct = p.predicted_winner_id === actualWinnerId;
    return {
      id: p.id,
      is_correct: correct,
      points_won: correct ? p.points_wagered * 2 : 0,
      resolved_at: new Date().toISOString(),
    };
  });

  for (const u of updates) {
    await sb.from("esport_predictions").update({ is_correct: u.is_correct, points_won: u.points_won, resolved_at: u.resolved_at }).eq("id", u.id);
  }
}

// ============================================================
// ACTIVITY
// ============================================================

export async function addActivity(
  champId: string,
  type: string,
  data: { user_id?: string; title: string; description?: string; meta?: Record<string, any> }
): Promise<EsportActivity> {
  const payload = {
    championship_id: champId,
    user_id: data.user_id ?? null,
    type,
    title: data.title,
    description: data.description ?? null,
    meta: data.meta ?? null,
    created_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_activity").insert(payload).select().single();
  if (error) throw new Error(`Erro ao adicionar atividade: ${error.message}`);
  return row as EsportActivity;
}

export async function getChampActivity(champId: string, limit?: number): Promise<EsportActivity[]> {
  let query = sb.from("esport_activity").select("*").eq("championship_id", champId).order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new Error(`Erro ao buscar atividades: ${error.message}`);
  return (data ?? []) as EsportActivity[];
}

// ============================================================
// MVP
// ============================================================

export async function voteMVP(
  matchId: string,
  voterId: string,
  candidateId: string,
  candidateName?: string
): Promise<MvpVote> {
  // Check if already voted
  const { data: existing } = await sb.from("esport_mvp_votes").select("id").eq("match_id", matchId).eq("voter_id", voterId).single();
  if (existing) throw new Error("Voce ja votou nesta partida.");

  const payload = {
    match_id: matchId,
    voter_id: voterId,
    candidate_id: candidateId,
    candidate_name: candidateName ?? null,
    created_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_mvp_votes").insert(payload).select().single();
  if (error) throw new Error(`Erro ao votar no MVP: ${error.message}`);
  return row as MvpVote;
}

export interface MVPResult {
  candidate_id: string;
  candidate_name: string;
  total_votes: number;
}

export async function getMatchMVP(matchId: string): Promise<MVPResult | null> {
  const { data, error } = await sb
    .from("esport_mvp_votes")
    .select("candidate_id, candidate_name")
    .eq("match_id", matchId);
  if (error) throw new Error(`Erro ao buscar MVP: ${error.message}`);
  if (!data || data.length === 0) return null;

  const counts: Record<string, { name: string; total: number }> = {};
  for (const v of data) {
    const cid = v.candidate_id as string;
    if (!counts[cid]) counts[cid] = { name: v.candidate_name ?? "Desconhecido", total: 0 };
    counts[cid].total++;
  }

  let best = "";
  let bestCount = 0;
  for (const [cid, info] of Object.entries(counts)) {
    if (info.total > bestCount) {
      best = cid;
      bestCount = info.total;
    }
  }

  if (!best) return null;
  return { candidate_id: best, candidate_name: counts[best].name, total_votes: bestCount };
}

// ============================================================
// REPORTS
// ============================================================

export async function submitReport(data: {
  championship_id?: string;
  match_id?: string;
  reporter_id: string;
  reported_user_id?: string;
  reason: string;
  description?: string;
  evidence_url?: string;
}): Promise<Report> {
  const payload = {
    championship_id: data.championship_id ?? null,
    match_id: data.match_id ?? null,
    reporter_id: data.reporter_id,
    reported_user_id: data.reported_user_id ?? null,
    reason: data.reason,
    description: data.description ?? null,
    evidence_url: data.evidence_url ?? null,
    status: "pending",
    admin_notes: null,
    resolved_by: null,
    resolved_at: null,
    created_at: new Date().toISOString(),
  };
  const { data: row, error } = await sb.from("esport_reports").insert(payload).select().single();
  if (error) throw new Error(`Erro ao enviar denuncia: ${error.message}`);
  return row as Report;
}

export async function getChampReports(champId: string): Promise<Report[]> {
  const { data, error } = await sb.from("esport_reports").select("*").eq("championship_id", champId).order("created_at", { ascending: false });
  if (error) throw new Error(`Erro ao buscar denuncias: ${error.message}`);
  return (data ?? []) as Report[];
}

// ============================================================
// STATS HELPERS
// ============================================================

export function calculateElo(currentRating: number, opponentRating: number, result: "win" | "loss" | "draw"): number {
  const K = 32;
  const expectedScore = 1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
  const actualScore = result === "win" ? 1 : result === "loss" ? 0 : 0.5;
  return Math.round(currentRating + K * (actualScore - expectedScore));
}

export async function distributePrizes(champId: string): Promise<void> {
  // Get championship prize distribution
  const { data: champ } = await sb.from("esport_championships").select("prize_pool, prize_distribution").eq("id", champId).single();
  if (!champ) throw new Error("Campeonato nao encontrado.");

  const distribution = (champ.prize_distribution as Record<string, number>) ?? {
    "1": 0.6,
    "2": 0.3,
    "3": 0.1,
  };
  const pool = champ.prize_pool ?? 0;

  // Get top 3 standings
  const standings = await getChampStandings(champId);
  const top3 = standings.slice(0, 3);

  for (let i = 0; i < top3.length; i++) {
    const placement = i + 1;
    const pct = distribution[String(placement)] ?? 0;
    const prize = Math.round(pool * pct);
    if (prize > 0) {
      await sb.from("esport_champ_teams").update({ placement, prize_won: prize }).eq("id", top3[i].id);
    }
  }

  await addActivity(champId, "prize_distributed", {
    title: "Premios distribuidos",
    description: `Os premios do campeonato foram distribuidos para os 3 primeiros colocados.`,
  });
}
