// =============================================================
// eSports Advanced Features Library
// Seasons, Betting, Anti-Cheat, Reputation, Transfers,
// Sponsors, Achievements, Stream Overlay, Match Chat
// =============================================================

import { supabase } from '@/integrations/supabase/client';
const sb: any = supabase;

// ============================================================
// TYPES
// ============================================================

export type SeasonStatus = 'upcoming' | 'active' | 'paused' | 'completed' | 'cancelled';
export type BetStatus = 'open' | 'settled' | 'refunded' | 'cancelled';
export type ReportCategory = 'cheating' | 'griefing' | 'smurfing' | 'boosting' | 'disconnection' | 'bug_exploit' | 'toxicity' | 'match_fixing' | 'other';
export type EvidenceType = 'screenshot' | 'video' | 'replay' | 'stream_clip' | 'log' | 'admin_note';
export type TransferStatus = 'requested' | 'accepted' | 'rejected' | 'cancelled';
export type SponsorStatus = 'pending' | 'active' | 'completed' | 'cancelled';
export type AchievementCategory = 'seasonal' | 'lifetime' | 'tournament' | 'streak' | 'social' | 'special';
export type PunishmentType = 'warning' | 'temporary_ban' | 'permanent_ban' | 'points_deduction' | 'match_forfeit';
export type PredictionMarketType = 'match_winner' | 'tournament_winner' | 'mvp' | 'first_blood' | 'map_winner' | 'special';
export type AchievementRarity = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary' | 'mythic';

export interface Season {
  id: string;
  name: string;
  slug: string;
  description?: string;
  game_id?: string;
  region_id?: string;
  creator_id?: string;
  business_id?: string;
  start_date: string;
  end_date: string;
  status: SeasonStatus;
  is_published: boolean;
  is_featured: boolean;
  total_rounds: number;
  matches_per_round: number;
  points_win: number;
  points_draw: number;
  points_loss: number;
  bonus_points_per_kill: number;
  max_teams: number;
  registered_teams: number;
  prize_pool: number;
  currency: string;
  prize_distribution: number[];
  prize_description?: string;
  cover_image_url?: string;
  primary_color: string;
  secondary_color: string;
  total_matches: number;
  total_viewers: number;
  created_at: string;
  updated_at: string;
}

export interface SeasonTeam {
  id: string;
  season_id: string;
  team_id?: string;
  team_name: string;
  team_logo?: string;
  matches_played: number;
  matches_won: number;
  matches_drawn: number;
  matches_lost: number;
  points: number;
  total_kills: number;
  total_deaths: number;
  total_damage: number;
  win_streak: number;
  loss_streak: number;
  best_win_streak: number;
  final_placement?: number;
  prize_won: number;
  registered_at: string;
}

export interface SeasonMatch {
  id: string;
  season_id: string;
  round_number: number;
  match_number: number;
  team1_id?: string;
  team2_id?: string;
  team1_name?: string;
  team2_name?: string;
  team1_logo?: string;
  team2_logo?: string;
  team1_score: number;
  team2_score: number;
  team1_kills: number;
  team2_kills: number;
  winner_id?: string;
  is_draw: boolean;
  scheduled_at?: string;
  started_at?: string;
  completed_at?: string;
  status: string;
  lobby_id?: string;
  lobby_password?: string;
  map_name?: string;
  mode_name?: string;
  viewer_count: number;
  mvp_user_id?: string;
  mvp_name?: string;
  created_at: string;
}

export interface Bet {
  id: string;
  user_id: string;
  match_id?: string;
  championship_id?: string;
  season_match_id?: string;
  bet_type: PredictionMarketType;
  predicted_outcome: Record<string, any>;
  predicted_label: string;
  odds: number;
  amount_wagered: number;
  potential_payout: number;
  status: BetStatus;
  is_correct?: boolean;
  amount_won: number;
  settled_at?: string;
  created_at: string;
}

export interface UserWallet {
  id: string;
  user_id: string;
  balance: number;
  total_earned: number;
  total_wagered: number;
  total_won: number;
  total_lost: number;
  created_at: string;
  updated_at: string;
}

export interface WalletTransaction {
  id: string;
  user_id: string;
  wallet_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
  created_at: string;
}

export interface Evidence {
  id: string;
  report_id?: string;
  championship_id?: string;
  match_id?: string;
  submitted_by?: string;
  target_user_id?: string;
  evidence_type: EvidenceType;
  file_url: string;
  thumbnail_url?: string;
  description?: string;
  metadata?: Record<string, any>;
  chain_index: number;
  parent_evidence_id?: string;
  is_verified: boolean;
  verified_by?: string;
  verified_at?: string;
  created_at: string;
}

export interface Punishment {
  id: string;
  user_id: string;
  team_id?: string;
  championship_id?: string;
  punishment_type: PunishmentType;
  reason: string;
  evidence_ids: string[];
  duration_days?: number;
  starts_at: string;
  ends_at?: string;
  is_active: boolean;
  points_deducted: number;
  matches_forfeited: number;
  issued_by?: string;
  created_at: string;
}

export interface UserReputation {
  id: string;
  user_id: string;
  karma_points: number;
  reputation_score: number;
  total_matches: number;
  total_wins: number;
  total_reports_filed: number;
  total_reports_against: number;
  reports_confirmed: number;
  reports_dismissed: number;
  no_show_count: number;
  disconnection_count: number;
  sportsmanship_votes: number;
  sportsmanship_total: number;
  reputation_title: string;
  earned_badges: string[];
  created_at: string;
  updated_at: string;
}

export interface SportsmanshipRating {
  id: string;
  match_id?: string;
  season_match_id?: string;
  rater_user_id: string;
  rated_user_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
  created_at: string;
}

export interface Transfer {
  id: string;
  player_user_id: string;
  from_team_id?: string;
  to_team_id?: string;
  status: TransferStatus;
  transfer_fee: number;
  contract_details?: Record<string, any>;
  requested_by?: string;
  responded_by?: string;
  message?: string;
  response_message?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Sponsor {
  id: string;
  championship_id?: string;
  season_id?: string;
  company_name: string;
  logo_url?: string;
  website_url?: string;
  contact_email?: string;
  sponsorship_type: string;
  value: number;
  currency: string;
  status: SponsorStatus;
  contract_details?: Record<string, any>;
  banner_url?: string;
  overlay_url?: string;
  social_mention: boolean;
  logo_placement: string;
  start_date?: string;
  end_date?: string;
  created_at: string;
}

export interface Achievement {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon_url?: string;
  icon_emoji?: string;
  category: AchievementCategory;
  requirement: Record<string, any>;
  reward_coins: number;
  reward_badge?: string;
  reward_xp: number;
  rarity: AchievementRarity;
  is_hidden: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
}

export interface UserAchievement {
  id: string;
  user_id: string;
  achievement_id: string;
  progress: number;
  target: number;
  is_completed: boolean;
  completed_at?: string;
  notified: boolean;
  created_at: string;
}

export interface PredictionMarket {
  id: string;
  championship_id?: string;
  match_id?: string;
  season_match_id?: string;
  market_type: PredictionMarketType;
  question: string;
  options: Array<{
    id: string;
    label: string;
    odds: number;
    total_wagered: number;
  }>;
  status: BetStatus;
  winning_option_id?: string;
  total_pool: number;
  total_bettors: number;
  closes_at?: string;
  settled_at?: string;
  created_at: string;
}

export interface HighlightClip {
  id: string;
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  clip_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  submitted_by?: string;
  player_user_id?: string;
  player_name?: string;
  team_name?: string;
  clip_type: string;
  views: number;
  likes: number;
  is_featured: boolean;
  created_at: string;
}

export interface StreamOverlay {
  id: string;
  championship_id?: string;
  season_id?: string;
  name: string;
  show_scores: boolean;
  show_teams: boolean;
  show_sponsors: boolean;
  show_bracket: boolean;
  show_mvp: boolean;
  show_social: boolean;
  show_chat: boolean;
  bg_color: string;
  bg_opacity: number;
  text_color: string;
  accent_color: string;
  font_family: string;
  position: string;
  widget_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MatchChatMessage {
  id: string;
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  team_id?: string;
  team_name?: string;
  message: string;
  message_type: string;
  is_pinned: boolean;
  likes: number;
  reports: number;
  is_deleted: boolean;
  created_at: string;
}

export interface CreateSeasonData {
  name: string;
  description?: string;
  game_id?: string;
  start_date: string;
  end_date: string;
  total_rounds?: number;
  points_win?: number;
  points_draw?: number;
  points_loss?: number;
  bonus_points_per_kill?: number;
  max_teams?: number;
  prize_pool?: number;
  currency?: string;
  prize_distribution?: number[];
  prize_description?: string;
  cover_image_url?: string;
  primary_color?: string;
  secondary_color?: string;
  is_featured?: boolean;
}

// ============================================================
// LABEL MAPS (Portuguese)
// ============================================================

export const SEASON_STATUS_LABELS: Record<SeasonStatus, string> = {
  upcoming: 'A Iniciar',
  active: 'Em Curso',
  paused: 'Pausada',
  completed: 'Concluida',
  cancelled: 'Cancelada',
};

export const BET_STATUS_LABELS: Record<BetStatus, string> = {
  open: 'Aberta',
  settled: 'Resolvida',
  refunded: 'Reembolsada',
  cancelled: 'Cancelada',
};

export const REPORT_CATEGORY_LABELS: Record<ReportCategory, string> = {
  cheating: 'Trapaça',
  griefing: 'Sabotagem',
  smurfing: 'Smurfing',
  boosting: 'Boosting',
  disconnection: 'Desconexao',
  bug_exploit: 'Explorar Bug',
  toxicity: 'Toxicidade',
  match_fixing: 'Manipulacao de Jogo',
  other: 'Outro',
};

export const EVIDENCE_TYPE_LABELS: Record<EvidenceType, string> = {
  screenshot: 'Screenshot',
  video: 'Video',
  replay: 'Replay',
  stream_clip: 'Clip de Stream',
  log: 'Log do Jogo',
  admin_note: 'Nota do Admin',
};

export const TRANSFER_STATUS_LABELS: Record<TransferStatus, string> = {
  requested: 'Pendente',
  accepted: 'Aceite',
  rejected: 'Rejeitado',
  cancelled: 'Cancelado',
};

export const PUNISHMENT_TYPE_LABELS: Record<PunishmentType, string> = {
  warning: 'Aviso',
  temporary_ban: 'Ban Temporario',
  permanent_ban: 'Ban Permanente',
  points_deduction: 'Deducao de Pontos',
  match_forfeit: 'Desistencia do Jogo',
};

export const ACHIEVEMENT_RARITY_LABELS: Record<AchievementRarity, string> = {
  common: 'Comum',
  uncommon: 'Incomum',
  rare: 'Raro',
  epic: 'Epico',
  legendary: 'Lendario',
  mythic: 'Mitico',
};

export const ACHIEVEMENT_RARITY_COLORS: Record<AchievementRarity, string> = {
  common: '#9CA3AF',
  uncommon: '#22C55E',
  rare: '#3B82F6',
  epic: '#A855F7',
  legendary: '#F59E0B',
  mythic: '#EF4444',
};

export const ACHIEVEMENT_CATEGORY_LABELS: Record<AchievementCategory, string> = {
  seasonal: 'Temporada',
  lifetime: 'Historico',
  tournament: 'Torneio',
  streak: 'Sequencias',
  social: 'Social',
  special: 'Especial',
};

export const PREDICTION_TYPE_LABELS: Record<PredictionMarketType, string> = {
  match_winner: 'Vencedor do Jogo',
  tournament_winner: 'Vencedor do Torneio',
  mvp: 'MVP do Jogo',
  first_blood: 'Primeira Eliminacao',
  map_winner: 'Vencedor do Mapa',
  special: 'Especial',
};

export const SPONSOR_TYPE_LABELS: Record<string, string> = {
  prize: 'Premio',
  product: 'Produto',
  media: 'Media',
  equipment: 'Equipamento',
  venue: 'Local',
  other: 'Outro',
};

// ============================================================
// HELPER
// ============================================================

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

// ============================================================
// SEASONS
// ============================================================

export async function createSeason(data: CreateSeasonData): Promise<Season> {
  const slug = slugify(data.name) + '-' + Date.now().toString(36);
  const { data: season, error } = await sb
    .from('esport_seasons')
    .insert({
      ...data,
      slug,
      prize_distribution: data.prize_distribution || [50, 30, 20],
      currency: data.currency || 'AOA',
      points_win: data.points_win ?? 3,
      points_draw: data.points_draw ?? 1,
      points_loss: data.points_loss ?? 0,
      bonus_points_per_kill: data.bonus_points_per_kill ?? 0.5,
      max_teams: data.max_teams || 16,
      total_rounds: data.total_rounds || 10,
      primary_color: data.primary_color || '#8B5CF6',
      secondary_color: data.secondary_color || '#EC4899',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar temporada: ' + error.message);
  return season;
}

export async function updateSeason(id: string, data: Partial<Season>): Promise<Season> {
  const { data: season, error } = await sb
    .from('esport_seasons')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error('Erro ao atualizar temporada: ' + error.message);
  return season;
}

export async function updateSeasonStatus(id: string, status: SeasonStatus): Promise<Season> {
  const { data: season, error } = await sb
    .from('esport_seasons')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error('Erro ao atualizar estado: ' + error.message);
  return season;
}

export async function getSeasons(filters?: {
  status?: SeasonStatus;
  game_id?: string;
  is_featured?: boolean;
  is_published?: boolean;
  limit?: number;
  offset?: number;
}): Promise<Season[]> {
  let query = sb.from('esport_seasons').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.game_id) query = query.eq('game_id', filters.game_id);
  if (filters?.is_featured !== undefined) query = query.eq('is_featured', filters.is_featured);
  if (filters?.is_published !== undefined) query = query.eq('is_published', filters.is_published);
  if (filters?.limit) query = query.limit(filters.limit);
  if (filters?.offset) query = query.range(filters.offset, (filters.offset || 0) + (filters?.limit || 20) - 1);
  const { data, error } = await query;
  if (error) throw new Error('Erro ao buscar temporadas: ' + error.message);
  return data || [];
}

export async function getSeason(id: string): Promise<Season | null> {
  const { data, error } = await sb.from('esport_seasons').select('*').eq('id', id).single();
  if (error) return null;
  return data;
}

export async function getSeasonBySlug(slug: string): Promise<Season | null> {
  const { data, error } = await sb.from('esport_seasons').select('*').eq('slug', slug).single();
  if (error) return null;
  return data;
}

export async function getFeaturedSeasons(): Promise<Season[]> {
  const { data, error } = await sb
    .from('esport_seasons')
    .select('*')
    .eq('is_featured', true)
    .eq('is_published', true)
    .order('created_at', { ascending: false })
    .limit(5);
  if (error) return [];
  return data || [];
}

// ============================================================
// SEASON TEAMS
// ============================================================

export async function registerSeasonTeam(seasonId: string, data: {
  team_id: string;
  team_name: string;
  team_logo?: string;
}): Promise<SeasonTeam> {
  const { data: st, error } = await sb
    .from('esport_season_teams')
    .insert({
      season_id: seasonId,
      team_id: data.team_id,
      team_name: data.team_name,
      team_logo: data.team_logo,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao registar equipa: ' + error.message);
  return st;
}

export async function getSeasonTeams(seasonId: string): Promise<SeasonTeam[]> {
  const { data, error } = await sb
    .from('esport_season_teams')
    .select('*')
    .eq('season_id', seasonId)
    .order('points', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getSeasonStandings(seasonId: string): Promise<SeasonTeam[]> {
  const { data, error } = await sb
    .from('esport_season_teams')
    .select('*')
    .eq('season_id', seasonId)
    .order('points', { ascending: false })
    .order('total_kills', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function removeSeasonTeam(seasonTeamId: string): Promise<void> {
  const { error } = await sb.from('esport_season_teams').delete().eq('id', seasonTeamId);
  if (error) throw new Error('Erro ao remover equipa: ' + error.message);
}

// ============================================================
// SEASON MATCHES
// ============================================================

export async function createSeasonMatch(data: {
  season_id: string;
  round_number: number;
  match_number: number;
  team1_id?: string;
  team2_id?: string;
  team1_name?: string;
  team2_name?: string;
  team1_logo?: string;
  team2_logo?: string;
  scheduled_at?: string;
  map_name?: string;
  mode_name?: string;
}): Promise<SeasonMatch> {
  const { data: match, error } = await sb
    .from('esport_season_matches')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error('Erro ao criar jogo: ' + error.message);
  return match;
}

export async function reportSeasonMatchResult(matchId: string, data: {
  team1_score: number;
  team2_score: number;
  team1_kills?: number;
  team2_kills?: number;
  winner_id?: string;
  is_draw?: boolean;
  mvp_user_id?: string;
  mvp_name?: string;
}): Promise<SeasonMatch> {
  const { data: match, error } = await sb
    .from('esport_season_matches')
    .update({
      ...data,
      status: 'completed',
      completed_at: new Date().toISOString(),
    })
    .eq('id', matchId)
    .select()
    .single();
  if (error) throw new Error('Erro ao reportar resultado: ' + error.message);
  return match;
}

export async function getSeasonMatches(seasonId: string, roundNumber?: number): Promise<SeasonMatch[]> {
  let query = sb
    .from('esport_season_matches')
    .select('*')
    .eq('season_id', seasonId)
    .order('round_number', { ascending: true })
    .order('match_number', { ascending: true });
  if (roundNumber !== undefined) query = query.eq('round_number', roundNumber);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function generateSeasonSchedule(seasonId: string, teamIds: string[], teamNames: string[], teamLogos: string[]): Promise<SeasonMatch[]> {
  const season = await getSeason(seasonId);
  if (!season) throw new Error('Temporada nao encontrada');

  const totalRounds = season.total_rounds || 10;
  const matches: SeasonMatch[] = [];
  let matchNum = 0;

  for (let round = 1; round <= totalRounds; round++) {
    const shuffled = [...teamIds]
      .map((id, i) => ({ id, name: teamNames[i], logo: teamLogos[i] }))
      .sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffled.length - 1; i += 2) {
      matchNum++;
      const match = await createSeasonMatch({
        season_id: seasonId,
        round_number: round,
        match_number: matchNum,
        team1_id: shuffled[i].id,
        team1_name: shuffled[i].name,
        team1_logo: shuffled[i].logo,
        team2_id: shuffled[i + 1].id,
        team2_name: shuffled[i + 1].name,
        team2_logo: shuffled[i + 1].logo,
      });
      matches.push(match);
    }
  }
  return matches;
}

export async function updateSeasonStandings(seasonId: string, matchId: string): Promise<SeasonTeam[]> {
  const match = await sb.from('esport_season_matches').select('*').eq('id', matchId).single();
  const season = await getSeason(seasonId);
  if (!match || !season) throw new Error('Jogo ou temporada nao encontrados');

  if (match.team1_id && match.winner_id === match.team1_id) {
    await sb.raw(
      `UPDATE esport_season_teams SET 
        matches_played = matches_played + 1, matches_won = matches_won + 1,
        points = points + ?, total_kills = total_kills + ?, total_deaths = total_deaths + ?,
        win_streak = win_streak + 1, loss_streak = 0,
        best_win_streak = GREATEST(best_win_streak, win_streak + 1)
        WHERE season_id = ? AND team_id = ?`,
      [season.points_win, match.team1_kills || 0, match.team2_kills || 0, seasonId, match.team1_id]
    );
    await sb.raw(
      `UPDATE esport_season_teams SET 
        matches_played = matches_played + 1, matches_lost = matches_lost + 1,
        points = points + ?, total_kills = total_kills + ?, total_deaths = total_deaths + ?,
        loss_streak = loss_streak + 1, win_streak = 0
        WHERE season_id = ? AND team_id = ?`,
      [season.points_loss, match.team2_kills || 0, match.team1_kills || 0, seasonId, match.team2_id]
    );
  } else if (match.team2_id && match.winner_id === match.team2_id) {
    await sb.raw(
      `UPDATE esport_season_teams SET 
        matches_played = matches_played + 1, matches_won = matches_won + 1,
        points = points + ?, total_kills = total_kills + ?, total_deaths = total_deaths + ?,
        win_streak = win_streak + 1, loss_streak = 0,
        best_win_streak = GREATEST(best_win_streak, win_streak + 1)
        WHERE season_id = ? AND team_id = ?`,
      [season.points_win, match.team2_kills || 0, match.team1_kills || 0, seasonId, match.team2_id]
    );
    await sb.raw(
      `UPDATE esport_season_teams SET 
        matches_played = matches_played + 1, matches_lost = matches_lost + 1,
        points = points + ?, total_kills = total_kills + ?, total_deaths = total_deaths + ?,
        loss_streak = loss_streak + 1, win_streak = 0
        WHERE season_id = ? AND team_id = ?`,
      [season.points_loss, match.team1_kills || 0, match.team2_kills || 0, seasonId, match.team1_id]
    );
  } else if (match.is_draw) {
    for (const tid of [match.team1_id, match.team2_id]) {
      if (!tid) continue;
      await sb.raw(
        `UPDATE esport_season_teams SET 
          matches_played = matches_played + 1, matches_drawn = matches_drawn + 1,
          points = points + ?, win_streak = 0, loss_streak = 0
          WHERE season_id = ? AND team_id = ?`,
        [season.points_draw, seasonId, tid]
      );
    }
  }

  return getSeasonStandings(seasonId);
}

// ============================================================
// WALLET & BETTING
// ============================================================

export async function getOrCreateWallet(userId: string): Promise<UserWallet> {
  const { data: wallet } = await sb.from('user_wallets').select('*').eq('user_id', userId).single();
  if (wallet) return wallet;

  const { data: newWallet, error } = await sb
    .from('user_wallets')
    .insert({ user_id: userId, balance: 1000 })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar carteira: ' + error.message);
  return newWallet;
}

export async function getWallet(userId: string): Promise<UserWallet | null> {
  const { data } = await sb.from('user_wallets').select('*').eq('user_id', userId).single();
  return data;
}

export async function addWalletTransaction(data: {
  user_id: string;
  type: string;
  amount: number;
  balance_after: number;
  description?: string;
  reference_id?: string;
}): Promise<WalletTransaction> {
  const wallet = await getOrCreateWallet(data.user_id);
  const { data: tx, error } = await sb
    .from('wallet_transactions')
    .insert({
      wallet_id: wallet.id,
      ...data,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao registar transacao: ' + error.message);
  return tx;
}

export async function placeBet(data: {
  user_id: string;
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  bet_type: PredictionMarketType;
  predicted_outcome: Record<string, any>;
  predicted_label: string;
  odds: number;
  amount_wagered: number;
}): Promise<Bet> {
  const wallet = await getOrCreateWallet(data.user_id);
  if (wallet.balance < data.amount_wagered) {
    throw new Error('Saldo insuficiente');
  }

  const newBalance = wallet.balance - data.amount_wagered;
  const potentialPayout = Math.floor(data.amount_wagered * data.odds);

  const { data: bet, error } = await sb
    .from('esport_bets')
    .insert({
      ...data,
      potential_payout: potentialPayout,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao apostar: ' + error.message);

  await sb
    .from('user_wallets')
    .update({
      balance: newBalance,
      total_wagered: wallet.total_wagered + data.amount_wagered,
    })
    .eq('user_id', data.user_id);

  await addWalletTransaction({
    user_id: data.user_id,
    type: 'bet_placed',
    amount: -data.amount_wagered,
    balance_after: newBalance,
    description: `Aposta: ${data.predicted_label} @ ${data.odds}x`,
    reference_id: bet.id,
  });

  return bet;
}

export async function settleBet(betId: string, isCorrect: boolean): Promise<Bet> {
  const { data: bet } = await sb.from('esport_bets').select('*').eq('id', betId).single();
  if (!bet) throw new Error('Aposta nao encontrada');
  if (bet.status !== 'open') throw new Error('Aposta ja resolvida');

  const wallet = await getOrCreateWallet(bet.user_id);
  let newBalance = wallet.balance;
  let amountWon = 0;

  if (isCorrect) {
    amountWon = bet.potential_payout;
    newBalance += amountWon;
    await sb.from('user_wallets').update({
      balance: newBalance,
      total_earned: wallet.total_earned + amountWon,
      total_won: wallet.total_won + amountWon,
    }).eq('user_id', bet.user_id);

    await addWalletTransaction({
      user_id: bet.user_id,
      type: 'bet_won',
      amount: amountWon,
      balance_after: newBalance,
      description: `Ganhaste ${amountWon} moedas!`,
      reference_id: betId,
    });
  } else {
    await sb.from('user_wallets').update({
      total_lost: wallet.total_lost + bet.amount_wagered,
    }).eq('user_id', bet.user_id);
  }

  const { data: settled, error } = await sb
    .from('esport_bets')
    .update({
      status: 'settled',
      is_correct: isCorrect,
      amount_won: amountWon,
      settled_at: new Date().toISOString(),
    })
    .eq('id', betId)
    .select()
    .single();
  if (error) throw new Error('Erro ao resolver aposta: ' + error.message);
  return settled;
}

export async function refundBet(betId: string): Promise<Bet> {
  const { data: bet } = await sb.from('esport_bets').select('*').eq('id', betId).single();
  if (!bet) throw new Error('Aposta nao encontrada');

  const wallet = await getOrCreateWallet(bet.user_id);
  const newBalance = wallet.balance + bet.amount_wagered;

  await sb.from('user_wallets').update({ balance: newBalance }).eq('user_id', bet.user_id);
  await addWalletTransaction({
    user_id: bet.user_id,
    type: 'bet_refunded',
    amount: bet.amount_wagered,
    balance_after: newBalance,
    description: 'Aposta reembolsada',
    reference_id: betId,
  });

  const { data: refunded, error } = await sb
    .from('esport_bets')
    .update({ status: 'refunded', settled_at: new Date().toISOString() })
    .eq('id', betId)
    .select()
    .single();
  if (error) throw new Error('Erro ao reembolsar: ' + error.message);
  return refunded;
}

export async function getUserBets(userId: string, filters?: {
  status?: BetStatus;
  championship_id?: string;
  limit?: number;
}): Promise<Bet[]> {
  let query = sb.from('esport_bets').select('*').eq('user_id', userId).order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.championship_id) query = query.eq('championship_id', filters.championship_id);
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getWalletTransactions(userId: string, limit = 20): Promise<WalletTransaction[]> {
  const { data, error } = await sb
    .from('wallet_transactions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function claimDailyBonus(userId: string): Promise<UserWallet> {
  const wallet = await getOrCreateWallet(userId);
  const bonus = 50;
  const newBalance = wallet.balance + bonus;

  await sb.from('user_wallets').update({
    balance: newBalance,
    total_earned: wallet.total_earned + bonus,
  }).eq('user_id', userId);

  await addWalletTransaction({
    user_id: userId,
    type: 'daily_bonus',
    amount: bonus,
    balance_after: newBalance,
    description: 'Bonus diario de 50 moedas!',
  });

  return { ...wallet, balance: newBalance, total_earned: wallet.total_earned + bonus };
}

// ============================================================
// PREDICTION MARKETS
// ============================================================

export async function createPredictionMarket(data: {
  championship_id?: string;
  match_id?: string;
  season_match_id?: string;
  market_type: PredictionMarketType;
  question: string;
  options: Array<{ id: string; label: string; odds: number }>;
  closes_at?: string;
}): Promise<PredictionMarket> {
  const optionsWithWagered = data.options.map(o => ({ ...o, total_wagered: 0 }));
  const { data: market, error } = await sb
    .from('esport_prediction_markets')
    .insert({
      ...data,
      options: optionsWithWagered,
      status: 'open',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar mercado: ' + error.message);
  return market;
}

export async function getMatchMarkets(matchId: string): Promise<PredictionMarket[]> {
  const { data, error } = await sb
    .from('esport_prediction_markets')
    .select('*')
    .eq('match_id', matchId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function settlePredictionMarket(
  marketId: string,
  winningOptionId: string
): Promise<PredictionMarket> {
  const { data: market } = await sb.from('esport_prediction_markets').select('*').eq('id', marketId).single();
  if (!market) throw new Error('Mercado nao encontrado');

  const { data: settled, error } = await sb
    .from('esport_prediction_markets')
    .update({
      status: 'settled',
      winning_option_id: winningOptionId,
      settled_at: new Date().toISOString(),
    })
    .eq('id', marketId)
    .select()
    .single();
  if (error) throw new Error('Erro ao resolver mercado: ' + error.message);
  return settled;
}

// ============================================================
// ANTI-CHEAT & EVIDENCE
// ============================================================

export async function submitEvidence(data: {
  report_id?: string;
  championship_id?: string;
  match_id?: string;
  submitted_by: string;
  target_user_id: string;
  evidence_type: EvidenceType;
  file_url: string;
  thumbnail_url?: string;
  description?: string;
  metadata?: Record<string, any>;
  parent_evidence_id?: string;
}): Promise<Evidence> {
  const { data: existing } = await sb
    .from('esport_evidence')
    .select('chain_index')
    .eq('match_id', data.match_id)
    .order('chain_index', { ascending: false })
    .limit(1);

  const chainIndex = (existing && existing.length > 0) ? (existing[0].chain_index + 1) : 0;

  const { data: evidence, error } = await sb
    .from('esport_evidence')
    .insert({
      ...data,
      chain_index: chainIndex,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao submeter evidencia: ' + error.message);
  return evidence;
}

export async function getMatchEvidence(matchId: string): Promise<Evidence[]> {
  const { data, error } = await sb
    .from('esport_evidence')
    .select('*')
    .eq('match_id', matchId)
    .order('chain_index', { ascending: true });
  if (error) return [];
  return data || [];
}

export async function verifyEvidence(evidenceId: string, verifiedBy: string): Promise<Evidence> {
  const { data, error } = await sb
    .from('esport_evidence')
    .update({
      is_verified: true,
      verified_by: verifiedBy,
      verified_at: new Date().toISOString(),
    })
    .eq('id', evidenceId)
    .select()
    .single();
  if (error) throw new Error('Erro ao verificar evidencia: ' + error.message);
  return data;
}

export async function issuePunishment(data: {
  user_id: string;
  team_id?: string;
  championship_id?: string;
  punishment_type: PunishmentType;
  reason: string;
  evidence_ids?: string[];
  duration_days?: number;
  points_deducted?: number;
  matches_forfeited?: number;
  issued_by: string;
}): Promise<Punishment> {
  const endsAt = data.duration_days
    ? new Date(Date.now() + data.duration_days * 86400000).toISOString()
    : null;

  const { data: punishment, error } = await sb
    .from('esport_punishments')
    .insert({
      ...data,
      ends_at: endsAt,
      evidence_ids: data.evidence_ids || [],
      points_deducted: data.points_deducted || 0,
      matches_forfeited: data.matches_forfeited || 0,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao aplicar punicao: ' + error.message);

  if (data.points_deducted && data.points_deducted > 0) {
    await sb.raw(
      `UPDATE user_reputation SET karma_points = GREATEST(0, karma_points - ?) WHERE user_id = ?`,
      [data.points_deducted, data.user_id]
    );
  }

  return punishment;
}

export async function getUserPunishments(userId: string): Promise<Punishment[]> {
  const { data, error } = await sb
    .from('esport_punishments')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getActivePunishments(userId: string): Promise<Punishment[]> {
  const { data, error } = await sb
    .from('esport_punishments')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

// ============================================================
// REPUTATION & SPORTSMANSHIP
// ============================================================

export async function getOrCreateReputation(userId: string): Promise<UserReputation> {
  const { data: rep } = await sb.from('user_reputation').select('*').eq('user_id', userId).single();
  if (rep) return rep;

  const { data: newRep, error } = await sb
    .from('user_reputation')
    .insert({ user_id: userId, karma_points: 100, reputation_score: 5.0 })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar reputacao: ' + error.message);
  return newRep;
}

export async function getReputation(userId: string): Promise<UserReputation | null> {
  const { data } = await sb.from('user_reputation').select('*').eq('user_id', userId).single();
  return data;
}

export async function getTopReputation(limit = 50): Promise<UserReputation[]> {
  const { data, error } = await sb
    .from('user_reputation')
    .select('*')
    .order('karma_points', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function rateSportsmanship(data: {
  match_id?: string;
  season_match_id?: string;
  rater_user_id: string;
  rated_user_id: string;
  rating: number;
  comment?: string;
  tags?: string[];
}): Promise<SportsmanshipRating> {
  const { data: rating, error } = await sb
    .from('sportsmanship_ratings')
    .insert(data)
    .select()
    .single();
  if (error) throw new Error('Erro ao avaliar: ' + error.message);

  await sb.raw(
    `UPDATE user_reputation SET 
      sportsmanship_votes = sportsmanship_votes + 1,
      sportsmanship_total = sportsmanship_total + ?,
      karma_points = karma_points + CASE WHEN ? >= 4 THEN 2 WHEN ? >= 3 THEN 0 ELSE -3 END
    WHERE user_id = ?`,
    [data.rating, data.rating, data.rating, data.rated_user_id]
  );

  return rating;
}

export async function getUserSportsmanshipRatings(userId: string): Promise<SportsmanshipRating[]> {
  const { data, error } = await sb
    .from('sportsmanship_ratings')
    .select('*')
    .eq('rated_user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return [];
  return data || [];
}

// ============================================================
// TRANSFERS
// ============================================================

export async function requestTransfer(data: {
  player_user_id: string;
  from_team_id?: string;
  to_team_id?: string;
  transfer_fee?: number;
  message?: string;
  requested_by: string;
}): Promise<Transfer> {
  const { data: transfer, error } = await sb
    .from('esport_transfers')
    .insert({
      ...data,
      status: 'requested',
      transfer_fee: data.transfer_fee || 0,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao solicitar transferencia: ' + error.message);
  return transfer;
}

export async function respondToTransfer(transferId: string, data: {
  status: 'accepted' | 'rejected';
  responded_by: string;
  response_message?: string;
}): Promise<Transfer> {
  const updateData: Record<string, any> = {
    status: data.status,
    responded_by: data.responded_by,
    response_message: data.response_message,
    updated_at: new Date().toISOString(),
  };

  if (data.status === 'accepted') {
    updateData.completed_at = new Date().toISOString();
  }

  const { data: transfer, error } = await sb
    .from('esport_transfers')
    .update(updateData)
    .eq('id', transferId)
    .select()
    .single();
  if (error) throw new Error('Erro ao responder transferencia: ' + error.message);
  return transfer;
}

export async function getTransfers(filters?: {
  status?: TransferStatus;
  player_user_id?: string;
  limit?: number;
}): Promise<Transfer[]> {
  let query = sb.from('esport_transfers').select('*').order('created_at', { ascending: false });
  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.player_user_id) query = query.eq('player_user_id', filters.player_user_id);
  if (filters?.limit) query = query.limit(filters.limit);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getOpenTransfers(limit = 20): Promise<Transfer[]> {
  return getTransfers({ status: 'requested', limit });
}

// ============================================================
// SPONSORS
// ============================================================

export async function createSponsor(data: {
  championship_id?: string;
  season_id?: string;
  company_name: string;
  logo_url?: string;
  website_url?: string;
  contact_email?: string;
  sponsorship_type?: string;
  value?: number;
  currency?: string;
  banner_url?: string;
  overlay_url?: string;
  social_mention?: boolean;
  logo_placement?: string;
  start_date?: string;
  end_date?: string;
}): Promise<Sponsor> {
  const { data: sponsor, error } = await sb
    .from('esport_sponsors')
    .insert({
      ...data,
      status: 'pending',
      currency: data.currency || 'AOA',
      sponsorship_type: data.sponsorship_type || 'prize',
      logo_placement: data.logo_placement || 'banner',
      social_mention: data.social_mention ?? true,
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar patrocinador: ' + error.message);
  return sponsor;
}

export async function getSponsors(championshipId?: string, seasonId?: string): Promise<Sponsor[]> {
  let query = sb.from('esport_sponsors').select('*').order('created_at', { ascending: false });
  if (championshipId) query = query.eq('championship_id', championshipId);
  if (seasonId) query = query.eq('season_id', seasonId);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function updateSponsorStatus(id: string, status: SponsorStatus): Promise<Sponsor> {
  const { data, error } = await sb
    .from('esport_sponsors')
    .update({ status })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error('Erro ao atualizar patrocinador: ' + error.message);
  return data;
}

export async function deleteSponsor(id: string): Promise<void> {
  const { error } = await sb.from('esport_sponsors').delete().eq('id', id);
  if (error) throw new Error('Erro ao remover patrocinador: ' + error.message);
}

// ============================================================
// ACHIEVEMENTS
// ============================================================

export async function getAchievements(category?: AchievementCategory): Promise<Achievement[]> {
  let query = sb
    .from('esport_achievements')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (category) query = query.eq('category', category);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function getUserAchievements(userId: string): Promise<(UserAchievement & { achievement?: Achievement })[]> {
  const { data, error } = await sb
    .from('user_achievements')
    .select('*, achievement:esport_achievements(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function checkAndUnlockAchievement(userId: string, type: string, currentValue: number): Promise<UserAchievement | null> {
  const { data: achievements } = await sb
    .from('esport_achievements')
    .select('*')
    .eq('is_active', true);
  if (!achievements) return null;

  for (const ach of achievements) {
    const req = ach.requirement as Record<string, any>;
    if (req.type !== type) continue;
    if (currentValue < req.count) continue;

    const { data: existing } = await sb
      .from('user_achievements')
      .select('*')
      .eq('user_id', userId)
      .eq('achievement_id', ach.id)
      .single();

    if (existing) {
      if (existing.is_completed) continue;
      await sb.from('user_achievements')
        .update({
          progress: Math.min(currentValue, req.count),
          is_completed: true,
          completed_at: new Date().toISOString(),
        })
        .eq('id', existing.id);

      if (ach.reward_coins > 0) {
        await sb.raw(
          `UPDATE user_wallets SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?`,
          [ach.reward_coins, ach.reward_coins, userId]
        );
        await addWalletTransaction({
          user_id: userId,
          type: 'achievement_reward',
          amount: ach.reward_coins,
          balance_after: 0,
          description: `Conquista desbloqueada: ${ach.name}! +${ach.reward_coins} moedas`,
          reference_id: ach.id,
        });
      }

      if (ach.reward_badge) {
        await sb.raw(
          `UPDATE user_reputation SET earned_badges = array_append(earned_badges, ?) WHERE user_id = ? AND NOT ? = ANY(earned_badges)`,
          [ach.reward_badge, userId, ach.reward_badge]
        );
      }

      return { ...existing, is_completed: true, completed_at: new Date().toISOString() };
    } else {
      const isCompleted = currentValue >= req.count;
      const { data: ua, error } = await sb
        .from('user_achievements')
        .insert({
          user_id: userId,
          achievement_id: ach.id,
          progress: Math.min(currentValue, req.count),
          target: req.count,
          is_completed: isCompleted,
          completed_at: isCompleted ? new Date().toISOString() : undefined,
        })
        .select()
        .single();
      if (error) continue;

      if (isCompleted && ach.reward_coins > 0) {
        await sb.raw(
          `UPDATE user_wallets SET balance = balance + ?, total_earned = total_earned + ? WHERE user_id = ?`,
          [ach.reward_coins, ach.reward_coins, userId]
        );
      }

      return ua;
    }
  }

  return null;
}

// ============================================================
// STREAM OVERLAYS
// ============================================================

export async function createStreamOverlay(data: {
  championship_id?: string;
  season_id?: string;
  name: string;
  show_scores?: boolean;
  show_teams?: boolean;
  show_sponsors?: boolean;
  show_bracket?: boolean;
  show_mvp?: boolean;
  bg_color?: string;
  accent_color?: string;
  text_color?: string;
  position?: string;
}): Promise<StreamOverlay> {
  const widgetUrl = `${window.location.origin}/esports/overlay/${data.championship_id || 'generic'}`;
  const { data: overlay, error } = await sb
    .from('esport_stream_overlays')
    .insert({
      ...data,
      widget_url: widgetUrl,
      show_scores: data.show_scores ?? true,
      show_teams: data.show_teams ?? true,
      show_sponsors: data.show_sponsors ?? true,
      show_mvp: data.show_mvp ?? true,
      bg_color: data.bg_color || '#000000',
      accent_color: data.accent_color || '#8B5CF6',
      text_color: data.text_color || '#FFFFFF',
      font_family: 'Inter',
      position: data.position || 'bottom',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao criar overlay: ' + error.message);
  return overlay;
}

export async function getStreamOverlays(championshipId?: string): Promise<StreamOverlay[]> {
  let query = sb.from('esport_stream_overlays').select('*').order('created_at', { ascending: false });
  if (championshipId) query = query.eq('championship_id', championshipId);
  const { data, error } = await query;
  if (error) return [];
  return data || [];
}

export async function toggleOverlay(id: string, isActive: boolean): Promise<StreamOverlay> {
  const { data, error } = await sb
    .from('esport_stream_overlays')
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw new Error('Erro ao atualizar overlay: ' + error.message);
  return data;
}

// ============================================================
// MATCH CHAT
// ============================================================

export async function sendMatchChatMessage(data: {
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  team_id?: string;
  team_name?: string;
  message: string;
  message_type?: string;
}): Promise<MatchChatMessage> {
  const { data: msg, error } = await sb
    .from('esport_match_chat')
    .insert({
      ...data,
      message_type: data.message_type || 'chat',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao enviar mensagem: ' + error.message);
  return msg;
}

export async function getMatchChatMessages(matchId: string, limit = 50): Promise<MatchChatMessage[]> {
  const { data, error } = await sb
    .from('esport_match_chat')
    .select('*')
    .eq('match_id', matchId)
    .eq('is_deleted', false)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function likeChatMessage(messageId: string): Promise<void> {
  await sb.raw(
    `UPDATE esport_match_chat SET likes = likes + 1 WHERE id = ?`,
    [messageId]
  );
}

export async function pinChatMessage(messageId: string, isPinned: boolean): Promise<void> {
  await sb.from('esport_match_chat')
    .update({ is_pinned: isPinned })
    .eq('id', messageId);
}

// ============================================================
// HIGHLIGHT CLIPS
// ============================================================

export async function submitHighlightClip(data: {
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  clip_url: string;
  thumbnail_url?: string;
  title?: string;
  description?: string;
  submitted_by: string;
  player_user_id?: string;
  player_name?: string;
  team_name?: string;
  clip_type?: string;
}): Promise<HighlightClip> {
  const { data: clip, error } = await sb
    .from('esport_highlight_clips')
    .insert({
      ...data,
      clip_type: data.clip_type || 'manual',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao submeter clip: ' + error.message);
  return clip;
}

export async function getMatchClips(matchId: string): Promise<HighlightClip[]> {
  const { data, error } = await sb
    .from('esport_highlight_clips')
    .select('*')
    .eq('match_id', matchId)
    .order('likes', { ascending: false });
  if (error) return [];
  return data || [];
}

export async function getFeaturedClips(limit = 20): Promise<HighlightClip[]> {
  const { data, error } = await sb
    .from('esport_highlight_clips')
    .select('*')
    .eq('is_featured', true)
    .order('likes', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function likeClip(clipId: string): Promise<void> {
  await sb.raw(`UPDATE esport_highlight_clips SET views = views + 1, likes = likes + 1 WHERE id = ?`, [clipId]);
}

// ============================================================
// DAILY BONUS CHECK
// ============================================================

export async function canClaimDailyBonus(userId: string): Promise<boolean> {
  const { data: tx } = await sb
    .from('wallet_transactions')
    .select('created_at')
    .eq('user_id', userId)
    .eq('type', 'daily_bonus')
    .order('created_at', { ascending: false })
    .limit(1);

  if (!tx || tx.length === 0) return true;
  const lastClaim = new Date(tx[0].created_at);
  const now = new Date();
  return lastClaim.toDateString() !== now.toDateString();
}

// ============================================================
// P2P CHALLENGE SYSTEM (Duelos Entre Usuarios)
// 3 Metodos: Duelo Direto (1v1) | Desafio de Grupo (2-8) | Liga de Amigos
// Moeda virtual com escrow — sem dinheiro real
// ============================================================

export type P2PChallengeType = 'duel' | 'group' | 'friend_league';
export type P2PChallengeStatus = 'pending' | 'waiting_opponent' | 'active' | 'scoring' | 'completed' | 'cancelled' | 'expired';
export type P2PChallengeFormat = 'best_of_3' | 'best_of_5' | 'best_of_7' | 'single_match';
export type P2PBetSide = 'team1' | 'team2' | 'draw' | 'custom';

export interface P2PChallenge {
  id: string;
  challenge_type: P2PChallengeType;
  status: P2PChallengeStatus;
  // Creator
  creator_id: string;
  creator_display_name: string;
  creator_avatar_url?: string;
  creator_prediction?: string;
  creator_score: number;
  // Opponent(s)
  opponent_id?: string;
  opponent_display_name?: string;
  opponent_avatar_url?: string;
  opponent_prediction?: string;
  opponent_score: number;
  // Group fields
  participants?: P2PParticipant[];
  max_participants?: number;
  // Match/Event reference
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  championship_name?: string;
  match_label?: string;
  market_type: PredictionMarketType;
  // Wager & Prize
  wager_amount: number;
  prize_pool: number;
  platform_fee: number;
  winner_id?: string;
  winner_display_name?: string;
  // Timing
  format: P2PChallengeFormat;
  total_rounds: number;
  current_round: number;
  expires_at: string;
  started_at?: string;
  completed_at?: string;
  // Social
  is_public: boolean;
  spectator_count: number;
  chat_enabled: boolean;
  trash_talk?: string;
  // Metadata
  invite_code?: string;
  created_at: string;
  updated_at: string;
}

export interface P2PParticipant {
  user_id: string;
  display_name: string;
  avatar_url?: string;
  prediction?: string;
  score: number;
  wager_paid: boolean;
  joined_at: string;
}

export interface P2PChallengeMessage {
  id: string;
  challenge_id: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  message: string;
  message_type: 'trash_talk' | 'chat' | 'system';
  created_at: string;
}

export interface P2PDuelStats {
  user_id: string;
  total_duels: number;
  duels_won: number;
  duels_lost: number;
  duels_draw: number;
  win_rate: number;
  current_streak: number;
  best_streak: number;
  total_wagered: number;
  total_won: number;
  total_profit: number;
  biggest_win: number;
  nemesis_id?: string;
  nemesis_name?: string;
  rival_id?: string;
  rival_name?: string;
}

export interface CreateP2PDuelData {
  creator_id: string;
  creator_display_name: string;
  creator_avatar_url?: string;
  opponent_username: string;
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  championship_name?: string;
  match_label?: string;
  market_type: PredictionMarketType;
  creator_prediction: string;
 wager_amount: number;
  format?: P2PChallengeFormat;
  expires_in_hours?: number;
  is_public?: boolean;
  trash_talk?: string;
}

export interface CreateP2PGroupData {
  creator_id: string;
  creator_display_name: string;
  creator_avatar_url?: string;
  match_id?: string;
  season_match_id?: string;
  championship_id?: string;
  championship_name?: string;
  match_label?: string;
  market_type: PredictionMarketType;
  creator_prediction: string;
  wager_amount: number;
  max_participants?: number;
  expires_in_hours?: number;
  is_public?: boolean;
}

export interface CreateFriendLeagueData {
  creator_id: string;
  creator_display_name: string;
  creator_avatar_url?: string;
  championship_id?: string;
  championship_name?: string;
  league_name: string;
  wager_per_match: number;
  total_matches: number;
  max_participants?: number;
  is_public?: boolean;
}

export const P2P_CHALLENGE_TYPE_LABELS: Record<P2PChallengeType, string> = {
  duel: 'Duelo 1v1',
  group: 'Desafio de Grupo',
  friend_league: 'Liga de Amigos',
};

export const P2P_CHALLENGE_STATUS_LABELS: Record<P2PChallengeStatus, string> = {
  pending: 'Pendente',
  waiting_opponent: 'A Esperar Oponente',
  active: 'Em Curso',
  scoring: 'A Pontuar',
  completed: 'Concluido',
  cancelled: 'Cancelado',
  expired: 'Expirado',
};

export const P2P_FORMAT_LABELS: Record<P2PChallengeFormat, string> = {
  single_match: 'Jogo Unico',
  best_of_3: 'Melhor de 3',
  best_of_5: 'Melhor de 5',
  best_of_7: 'Melhor de 7',
};

export const P2P_WAGER_PRESETS = [25, 50, 100, 250, 500, 1000];

const P2P_PLATFORM_FEE_RATE = 0.05; // 5% platform fee

function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

// ============================================================
// P2P DUEL (1v1)
// ============================================================

export async function createP2PDuel(data: CreateP2PDuelData): Promise<P2PChallenge> {
  // Check creator wallet
  const wallet = await getOrCreateWallet(data.creator_id);
  if (wallet.balance < data.wager_amount) {
    throw new Error('Saldo insuficiente para criar duelo');
  }

  const platformFee = Math.floor(data.wager_amount * P2P_PLATFORM_FEE_RATE);
 const expiresAt = new Date(Date.now() + (data.expires_in_hours || 24) * 3600000).toISOString();

  // Deduct wager from creator (escrow)
  const newBalance = wallet.balance - data.wager_amount;
  await sb.from('user_wallets').update({
    balance: newBalance,
    total_wagered: wallet.total_wagered + data.wager_amount,
  }).eq('user_id', data.creator_id);

  const { data: challenge, error } = await sb
    .from('p2p_challenges')
    .insert({
      challenge_type: 'duel',
      status: 'waiting_opponent',
      creator_id: data.creator_id,
      creator_display_name: data.creator_display_name,
      creator_avatar_url: data.creator_avatar_url,
      creator_prediction: data.creator_prediction,
      creator_score: 0,
      opponent_score: 0,
      match_id: data.match_id,
      season_match_id: data.season_match_id,
      championship_id: data.championship_id,
      championship_name: data.championship_name,
      match_label: data.match_label,
      market_type: data.market_type,
      wager_amount: data.wager_amount,
      prize_pool: data.wager_amount,
      platform_fee: platformFee,
      format: data.format || 'single_match',
      total_rounds: data.format === 'single_match' ? 1 : parseInt(data.format?.split('_').pop() || '3'),
      current_round: 0,
      expires_at: expiresAt,
      is_public: data.is_public ?? true,
      spectator_count: 0,
      chat_enabled: true,
      trash_talk: data.trash_talk,
      invite_code: generateInviteCode(),
    })
    .select()
    .single();

  if (error) {
    // Refund if insert fails
    await sb.from('user_wallets').update({ balance: wallet.balance }).eq('user_id', data.creator_id);
    throw new Error('Erro ao criar duelo: ' + error.message);
  }

  // Record escrow transaction
  await addWalletTransaction({
    user_id: data.creator_id,
    type: 'p2p_escrow',
    amount: -data.wager_amount,
    balance_after: newBalance,
    description: `Escrow duelo P2P #${challenge.id.slice(0, 8)}`,
    reference_id: challenge.id,
  });

  return challenge;
}

export async function acceptP2PDuel(
  challengeId: string,
  opponentId: string,
  opponentDisplayName: string,
  opponentAvatarUrl?: string,
  opponentPrediction?: string,
): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Duelo nao encontrado');
  if (challenge.status !== 'waiting_opponent') throw new Error('Duelo nao esta a espera de oponente');
  if (challenge.creator_id === opponentId) throw new Error('Nao podes aceitar o teu proprio duelo');

  // Check opponent wallet
  const wallet = await getOrCreateWallet(opponentId);
  if (wallet.balance < challenge.wager_amount) {
    throw new Error('Saldo insuficiente para aceitar o duelo');
  }

  // Deduct wager from opponent (escrow)
  const newBalance = wallet.balance - challenge.wager_amount;
  await sb.from('user_wallets').update({
    balance: newBalance,
    total_wagered: wallet.total_wagered + challenge.wager_amount,
  }).eq('user_id', opponentId);

  const newPrizePool = challenge.prize_pool + challenge.wager_amount;
  const newPlatformFee = Math.floor(newPrizePool * P2P_PLATFORM_FEE_RATE);

  const { data: updated, error } = await sb
    .from('p2p_challenges')
    .update({
      status: 'active',
      opponent_id: opponentId,
      opponent_display_name: opponentDisplayName,
      opponent_avatar_url: opponentAvatarUrl,
      opponent_prediction: opponentPrediction,
      prize_pool: newPrizePool,
      platform_fee: newPlatformFee,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .select()
    .single();

  if (error) {
    await sb.from('user_wallets').update({ balance: wallet.balance }).eq('user_id', opponentId);
    throw new Error('Erro ao aceitar duelo: ' + error.message);
  }

  await addWalletTransaction({
    user_id: opponentId,
    type: 'p2p_escrow',
    amount: -challenge.wager_amount,
    balance_after: newBalance,
    description: `Escrow duelo P2P #${challengeId.slice(0, 8)}`,
    reference_id: challengeId,
  });

  return updated;
}

export async function declineP2PDuel(challengeId: string): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Duelo nao encontrado');
  if (challenge.status !== 'waiting_opponent') throw new Error('Duelo nao pode ser recusado');

  // Refund creator
  const wallet = await getOrCreateWallet(challenge.creator_id);
  const newBalance = wallet.balance + challenge.wager_amount;
  await sb.from('user_wallets').update({ balance: newBalance }).eq('user_id', challenge.creator_id);
  await addWalletTransaction({
    user_id: challenge.creator_id,
    type: 'p2p_refund',
    amount: challenge.wager_amount,
    balance_after: newBalance,
    description: `Reembolso duelo recusado #${challengeId.slice(0, 8)}`,
    reference_id: challengeId,
  });

  const { data: updated, error } = await sb
    .from('p2p_challenges')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', challengeId)
    .select()
    .single();
  if (error) throw new Error('Erro ao recusar duelo: ' + error.message);
  return updated;
}

export async function cancelP2PChallenge(challengeId: string, userId: string): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Desafio nao encontrado');
  if (challenge.creator_id !== userId) throw new Error('So o criador pode cancelar');
  if (!['pending', 'waiting_opponent'].includes(challenge.status)) {
    throw new Error('Desafio ja esta em curso e nao pode ser cancelado');
  }

  // Refund all escrowed amounts
  if (challenge.status === 'waiting_opponent') {
    const wallet = await getOrCreateWallet(challenge.creator_id);
    const newBalance = wallet.balance + challenge.wager_amount;
    await sb.from('user_wallets').update({ balance: newBalance }).eq('user_id', challenge.creator_id);
    await addWalletTransaction({
      user_id: challenge.creator_id,
      type: 'p2p_refund',
      amount: challenge.wager_amount,
      balance_after: newBalance,
      description: `Cancelamento duelo #${challengeId.slice(0, 8)}`,
      reference_id: challengeId,
    });
  }

  // For group challenges, refund all participants
  if (challenge.participants && challenge.participants.length > 0) {
    for (const p of challenge.participants) {
      if (p.wager_paid) {
        const w = await getOrCreateWallet(p.user_id);
        const nb = w.balance + challenge.wager_amount;
        await sb.from('user_wallets').update({ balance: nb }).eq('user_id', p.user_id);
        await addWalletTransaction({
          user_id: p.user_id,
          type: 'p2p_refund',
          amount: challenge.wager_amount,
          balance_after: nb,
          description: `Cancelamento desafio #${challengeId.slice(0, 8)}`,
          reference_id: challengeId,
        });
      }
    }
  }

  const { data: updated, error } = await sb
    .from('p2p_challenges')
    .update({ status: 'cancelled', updated_at: new Date().toISOString() })
    .eq('id', challengeId)
    .select()
    .single();
  if (error) throw new Error('Erro ao cancelar: ' + error.message);
  return updated;
}

// ============================================================
// SETTLE P2P DUEL
// ============================================================

export async function settleP2PDuel(
  challengeId: string,
  winnerId: string,
  isDraw: boolean = false,
): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Duelo nao encontrado');
  if (challenge.status !== 'active') throw new Error('Duelo nao esta ativo');

  const winnerIsCreator = winnerId === challenge.creator_id;
  const winnerName = winnerIsCreator ? challenge.creator_display_name : (challenge.opponent_display_name || 'Oponente');
  const loserId = winnerIsCreator ? challenge.opponent_id : challenge.creator_id;

  let winnerPayout = 0;

  if (isDraw) {
    // Refund both
    for (const uid of [challenge.creator_id, challenge.opponent_id!]) {
      if (!uid) continue;
      const w = await getOrCreateWallet(uid);
      const nb = w.balance + challenge.wager_amount;
      await sb.from('user_wallets').update({ balance: nb }).eq('user_id', uid);
      await addWalletTransaction({
        user_id: uid,
        type: 'p2p_draw',
        amount: challenge.wager_amount,
        balance_after: nb,
        description: `Empate no duelo #${challengeId.slice(0, 8)} — reembolsado`,
        reference_id: challengeId,
      });
    }
  } else {
    // Winner takes prize pool minus platform fee
    winnerPayout = challenge.prize_pool - challenge.platform_fee;
    const w = await getOrCreateWallet(winnerId!);
    const nb = w.balance + winnerPayout;
    await sb.from('user_wallets').update({
      balance: nb,
      total_earned: w.total_earned + winnerPayout,
      total_won: w.total_won + winnerPayout,
    }).eq('user_id', winnerId!);
    await addWalletTransaction({
      user_id: winnerId!,
      type: 'p2p_won',
      amount: winnerPayout,
      balance_after: nb,
      description: `Vitória no duelo! +${winnerPayout} moedas vs ${winnerIsCreator ? challenge.opponent_display_name : challenge.creator_display_name}`,
      reference_id: challengeId,
    });

    // Record loss for loser
    if (loserId) {
      const lw = await getOrCreateWallet(loserId);
      await sb.from('user_wallets').update({
        total_lost: lw.total_lost + challenge.wager_amount,
      }).eq('user_id', loserId);
      await addWalletTransaction({
        user_id: loserId,
        type: 'p2p_lost',
        amount: 0,
        balance_after: lw.balance,
        description: `Derrota no duelo vs ${winnerName}`,
        reference_id: challengeId,
      });
    }
  }

  const { data: settled, error } = await sb
    .from('p2p_challenges')
    .update({
      status: 'completed',
      winner_id: isDraw ? null : winnerId,
      winner_display_name: isDraw ? null : winnerName,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .select()
    .single();
  if (error) throw new Error('Erro ao resolver duelo: ' + error.message);
  return settled;
}

// ============================================================
// P2P GROUP CHALLENGE (2-8 players)
// ============================================================

export async function createP2PGroupChallenge(data: CreateP2PGroupData): Promise<P2PChallenge> {
  const wallet = await getOrCreateWallet(data.creator_id);
  if (wallet.balance < data.wager_amount) {
    throw new Error('Saldo insuficiente');
  }

  const maxP = data.max_participants || 8;
  const expiresAt = new Date(Date.now() + (data.expires_in_hours || 48) * 3600000).toISOString();
  const platformFee = Math.floor(data.wager_amount * P2P_PLATFORM_FEE_RATE);

  // Deduct creator wager
  const newBalance = wallet.balance - data.wager_amount;
  await sb.from('user_wallets').update({
    balance: newBalance,
    total_wagered: wallet.total_wagered + data.wager_amount,
  }).eq('user_id', data.creator_id);

  const creatorParticipant: P2PParticipant = {
    user_id: data.creator_id,
    display_name: data.creator_display_name,
    avatar_url: data.creator_avatar_url,
    prediction: data.creator_prediction,
    score: 0,
    wager_paid: true,
    joined_at: new Date().toISOString(),
  };

  const { data: challenge, error } = await sb
    .from('p2p_challenges')
    .insert({
      challenge_type: 'group',
      status: 'active',
      creator_id: data.creator_id,
      creator_display_name: data.creator_display_name,
      creator_avatar_url: data.creator_avatar_url,
      creator_prediction: data.creator_prediction,
      creator_score: 0,
      opponent_score: 0,
      participants: [creatorParticipant],
      max_participants: maxP,
      match_id: data.match_id,
      season_match_id: data.season_match_id,
      championship_id: data.championship_id,
      championship_name: data.championship_name,
      match_label: data.match_label,
      market_type: data.market_type,
      wager_amount: data.wager_amount,
      prize_pool: data.wager_amount,
      platform_fee: platformFee,
      format: 'single_match',
      total_rounds: 1,
      current_round: 1,
      expires_at: expiresAt,
      is_public: data.is_public ?? true,
      spectator_count: 0,
      chat_enabled: true,
      invite_code: generateInviteCode(),
    })
    .select()
    .single();

  if (error) {
    await sb.from('user_wallets').update({ balance: wallet.balance }).eq('user_id', data.creator_id);
    throw new Error('Erro ao criar desafio de grupo: ' + error.message);
  }

  await addWalletTransaction({
    user_id: data.creator_id,
    type: 'p2p_escrow',
    amount: -data.wager_amount,
    balance_after: newBalance,
    description: `Escrow desafio de grupo #${challenge.id.slice(0, 8)}`,
    reference_id: challenge.id,
  });

  return challenge;
}

export async function joinP2PGroupChallenge(
  challengeId: string,
  userId: string,
  displayName: string,
  avatarUrl?: string,
  prediction?: string,
): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Desafio nao encontrado');
  if (challenge.challenge_type !== 'group') throw new Error('Este desafio nao e de grupo');
  if (challenge.status !== 'active') throw new Error('Desafio nao esta ativo');
  if (!challenge.participants) throw new Error('Dados do desafio invalidos');

  const currentParticipants = challenge.participants as unknown as P2PParticipant[];
  if (currentParticipants.some(p => p.user_id === userId)) {
    throw new Error('Ja estas neste desafio');
  }
  if (currentParticipants.length >= (challenge.max_participants || 8)) {
    throw new Error('Desafio esta cheio');
  }

  // Check & deduct wallet
  const wallet = await getOrCreateWallet(userId);
  if (wallet.balance < challenge.wager_amount) {
    throw new Error('Saldo insuficiente para entrar');
  }
  const newBalance = wallet.balance - challenge.wager_amount;
  await sb.from('user_wallets').update({
    balance: newBalance,
    total_wagered: wallet.total_wagered + challenge.wager_amount,
  }).eq('user_id', userId);

  const newParticipant: P2PParticipant = {
    user_id: userId,
    display_name: displayName,
    avatar_url: avatarUrl,
    prediction: prediction,
    score: 0,
    wager_paid: true,
    joined_at: new Date().toISOString(),
  };

  const updatedParticipants = [...currentParticipants, newParticipant];
  const newPrizePool = challenge.prize_pool + challenge.wager_amount;
  const newPlatformFee = Math.floor(newPrizePool * P2P_PLATFORM_FEE_RATE);

  const { data: updated, error } = await sb
    .from('p2p_challenges')
    .update({
      participants: updatedParticipants,
      prize_pool: newPrizePool,
      platform_fee: newPlatformFee,
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .select()
    .single();

  if (error) {
    await sb.from('user_wallets').update({ balance: wallet.balance }).eq('user_id', userId);
    throw new Error('Erro ao entrar no desafio: ' + error.message);
  }

  await addWalletTransaction({
    user_id: userId,
    type: 'p2p_escrow',
    amount: -challenge.wager_amount,
    balance_after: newBalance,
    description: `Entrada no desafio de grupo #${challengeId.slice(0, 8)}`,
    reference_id: challengeId,
  });

  return updated;
}

export async function settleP2PGroupChallenge(
  challengeId: string,
  winnerId: string,
): Promise<P2PChallenge> {
  const { data: challenge } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  if (!challenge) throw new Error('Desafio nao encontrado');
  if (challenge.status !== 'active') throw new Error('Desafio nao esta ativo');

  const payout = challenge.prize_pool - challenge.platform_fee;
  const w = await getOrCreateWallet(winnerId);
  const nb = w.balance + payout;
  await sb.from('user_wallets').update({
    balance: nb,
    total_earned: w.total_earned + payout,
    total_won: w.total_won + payout,
  }).eq('user_id', winnerId);

  const participants = (challenge.participants || []) as unknown as P2PParticipant[];
  const winnerName = participants.find(p => p.user_id === winnerId)?.display_name || 'Vencedor';

  await addWalletTransaction({
    user_id: winnerId,
    type: 'p2p_won',
    amount: payout,
    balance_after: nb,
    description: `Venceste o desafio de grupo! +${payout} moedas`,
    reference_id: challengeId,
  });

  // Record losses
  for (const p of participants) {
    if (p.user_id === winnerId) continue;
    const lw = await getOrCreateWallet(p.user_id);
    await sb.from('user_wallets').update({
      total_lost: lw.total_lost + challenge.wager_amount,
    }).eq('user_id', p.user_id);
  }

  const { data: settled, error } = await sb
    .from('p2p_challenges')
    .update({
      status: 'completed',
      winner_id: winnerId,
      winner_display_name: winnerName,
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', challengeId)
    .select()
    .single();
  if (error) throw new Error('Erro ao resolver desafio: ' + error.message);
  return settled;
}

// ============================================================
// P2P QUERIES
// ============================================================

export async function getOpenDuels(limit = 20): Promise<P2PChallenge[]> {
  const { data, error } = await sb
    .from('p2p_challenges')
    .select('*')
    .eq('challenge_type', 'duel')
    .eq('status', 'waiting_opponent')
    .eq('is_public', true)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getOpenGroupChallenges(limit = 20): Promise<P2PChallenge[]> {
  const { data, error } = await sb
    .from('p2p_challenges')
    .select('*')
    .eq('challenge_type', 'group')
    .eq('status', 'active')
    .eq('is_public', true)
    .order('prize_pool', { ascending: false })
    .limit(limit);
  if (error) return [];
  return data || [];
}

export async function getUserP2PChallenges(
  userId: string,
  filters?: {
    status?: P2PChallengeStatus;
    challenge_type?: P2PChallengeType;
    limit?: number;
  },
): Promise<P2PChallenge[]> {
  // Query where user is creator or opponent
  let query = sb
    .from('p2p_challenges')
    .select('*')
    .or(`creator_id.eq.${userId},opponent_id.eq.${userId}`)
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.challenge_type) query = query.eq('challenge_type', filters.challenge_type);
  if (filters?.limit) query = query.limit(filters.limit);

  const { data, error } = await query;
  if (error) return [];

  // Also check group challenges where user is in participants
  const groupQuery = sb
    .from('p2p_challenges')
    .select('*')
    .eq('challenge_type', 'group')
    .neq('creator_id', userId);

  const { data: groupData } = await groupQuery;
  const userGroups = (groupData || []).filter((c: any) => {
    const parts = (c.participants || []) as unknown as P2PParticipant[];
    return parts.some(p => p.user_id === userId);
  });

  const all = [...(data || []), ...userGroups];
  // Remove duplicates
  const seen = new Set<string>();
  return all.filter((c: any) => {
    if (seen.has(c.id)) return false;
    seen.add(c.id);
    if (filters?.status && c.status !== filters.status) return false;
    if (filters?.challenge_type && c.challenge_type !== filters.challenge_type) return false;
    return true;
  });
}

export async function getP2PChallengeById(challengeId: string): Promise<P2PChallenge | null> {
  const { data } = await sb.from('p2p_challenges').select('*').eq('id', challengeId).single();
  return data;
}

export async function getP2PChallengeByInviteCode(code: string): Promise<P2PChallenge | null> {
  const { data } = await sb.from('p2p_challenges').select('*').eq('invite_code', code.toUpperCase()).single();
  return data;
}

// ============================================================
// P2P DUEL STATS
// ============================================================

export async function getUserP2PStats(userId: string): Promise<P2PDuelStats> {
  const challenges = await getUserP2PChallenges(userId, { status: 'completed' });

  let wins = 0, losses = 0, draws = 0, totalWagered = 0, totalWon = 0;
  let currentStreak = 0, bestStreak = 0, biggestWin = 0;
  const lossMap: Record<string, number> = {};
  const rivalMap: Record<string, number> = {};

  for (const c of challenges) {
    totalWagered += c.wager_amount;
    if (c.winner_id === userId) {
      wins++;
      currentStreak++;
      bestStreak = Math.max(bestStreak, currentStreak);
      const payout = c.prize_pool - c.platform_fee;
      totalWon += payout;
      biggestWin = Math.max(biggestWin, payout);
      // Track rival (most played against)
      const oppId = c.creator_id === userId ? c.opponent_id : c.creator_id;
      if (oppId) rivalMap[oppId] = (rivalMap[oppId] || 0) + 1;
    } else if (c.winner_id) {
      losses++;
      currentStreak = 0;
      const oppId = c.winner_id;
      if (oppId) lossMap[oppId] = (lossMap[oppId] || 0) + 1;
    } else {
      draws++;
    }
  }

  // Find nemesis (most losses against)
  let nemesisId: string | undefined, nemesisName: string | undefined;
  let maxLosses = 0;
  for (const [uid, count] of Object.entries(lossMap)) {
    if (count > maxLosses) {
      maxLosses = count;
      nemesisId = uid;
    }
  }
  if (nemesisId) {
    const nChallenge = challenges.find(c => c.creator_id === nemesisId || c.opponent_id === nemesisId);
    nemesisName = nChallenge?.creator_id === nemesisId ? nChallenge.creator_display_name : nChallenge?.opponent_display_name;
  }

  // Find rival (most matches against)
  let rivalId: string | undefined, rivalName: string | undefined;
  let maxMatches = 0;
  for (const [uid, count] of Object.entries(rivalMap)) {
    if (count > maxMatches) {
      maxMatches = count;
      rivalId = uid;
    }
  }
  if (rivalId) {
    const rChallenge = challenges.find(c => c.creator_id === rivalId || c.opponent_id === rivalId);
    rivalName = rChallenge?.creator_id === rivalId ? rChallenge.creator_display_name : rChallenge?.opponent_display_name;
  }

  const total = wins + losses + draws;
  return {
    user_id: userId,
    total_duels: total,
    duels_won: wins,
    duels_lost: losses,
    duels_draw: draws,
    win_rate: total > 0 ? Math.round((wins / total) * 100) : 0,
    current_streak: currentStreak,
    best_streak: bestStreak,
    total_wagered: totalWagered,
    total_won: totalWon,
    total_profit: totalWon - totalWagered,
    biggest_win: biggestWin,
    nemesis_id: nemesisId,
    nemesis_name: nemesisName,
    rival_id: rivalId,
    rival_name: rivalName,
  };
}

export async function getTopP2PDuelers(limit = 50): Promise<P2PDuelStats[]> {
  // Get all completed challenges to compute leaderboard
  const { data: completed } = await sb
    .from('p2p_challenges')
    .select('*')
    .eq('status', 'completed')
    .order('prize_pool', { ascending: false });

  if (!completed || completed.length === 0) return [];

  const userWINS: Record<string, { wins: number; total: number; won: number; wagered: number; streak: number; bestStreak: number; name: string; avatar: string }> = {};

  for (const c of completed) {
    for (const uid of [c.creator_id, c.opponent_id]) {
      if (!uid) continue;
      if (!userWINS[uid]) {
        const name = c.creator_id === uid ? c.creator_display_name : (c.opponent_display_name || 'Anonimo');
        const avatar = c.creator_id === uid ? (c.creator_avatar_url || '') : (c.opponent_avatar_url || '');
        userWINS[uid] = { wins: 0, total: 0, won: 0, wagered: 0, streak: 0, bestStreak: 0, name, avatar };
      }
      userWINS[uid].total++;
      userWINS[uid].wagered += c.wager_amount;
      if (c.winner_id === uid) {
        userWINS[uid].wins++;
        userWINS[uid].won += c.prize_pool - c.platform_fee;
        userWINS[uid].streak++;
        userWINS[uid].bestStreak = Math.max(userWINS[uid].bestStreak, userWINS[uid].streak);
      } else {
        userWINS[uid].streak = 0;
      }
    }
  }

  return Object.entries(userWINS)
    .map(([uid, s]) => ({
      user_id: uid,
      total_duels: s.total,
      duels_won: s.wins,
      duels_lost: s.total - s.wins,
      duels_draw: 0,
      win_rate: s.total > 0 ? Math.round((s.wins / s.total) * 100) : 0,
      current_streak: s.streak,
      best_streak: s.bestStreak,
      total_wagered: s.wagered,
      total_won: s.won,
      total_profit: s.won - s.wagered,
      biggest_win: 0,
    }))
    .sort((a, b) => b.win_rate - a.win_rate || b.total_won - a.total_won)
    .slice(0, limit);
}

// ============================================================
// P2P TRASH TALK & MESSAGES
// ============================================================

export async function sendP2PMessage(data: {
  challenge_id: string;
  user_id: string;
  username: string;
  user_avatar?: string;
  message: string;
  message_type?: 'trash_talk' | 'chat' | 'system';
}): Promise<P2PChallengeMessage> {
  const { data: msg, error } = await sb
    .from('p2p_challenge_messages')
    .insert({
      ...data,
      message_type: data.message_type || 'chat',
    })
    .select()
    .single();
  if (error) throw new Error('Erro ao enviar mensagem: ' + error.message);
  return msg;
}

export async function getP2PMessages(challengeId: string, limit = 50): Promise<P2PChallengeMessage[]> {
  const { data, error } = await sb
    .from('p2p_challenge_messages')
    .select('*')
    .eq('challenge_id', challengeId)
    .order('created_at', { ascending: true })
    .limit(limit);
  if (error) return [];
  return data || [];
}

// ============================================================
// P2P EXPIRY CHECK (call from cron/scheduler)
// ============================================================

export async function expireP2PChallenges(): Promise<number> {
  const now = new Date().toISOString();
  const { data: expired } = await sb
    .from('p2p_challenges')
    .select('*')
    .in('status', ['waiting_opponent', 'pending'])
    .lt('expires_at', now);

  if (!expired || expired.length === 0) return 0;

  let count = 0;
  for (const c of expired) {
    // Refund creator
    const wallet = await getOrCreateWallet(c.creator_id);
    const nb = wallet.balance + c.wager_amount;
    await sb.from('user_wallets').update({ balance: nb }).eq('user_id', c.creator_id);
    await addWalletTransaction({
      user_id: c.creator_id,
      type: 'p2p_refund',
      amount: c.wager_amount,
      balance_after: nb,
      description: `Duelo expirado #${c.id.slice(0, 8)} — reembolsado`,
      reference_id: c.id,
    });

    // For group challenges, refund all participants
    if (c.participants) {
      const parts = (c.participants || []) as unknown as P2PParticipant[];
      for (const p of parts) {
        if (p.wager_paid && p.user_id !== c.creator_id) {
          const pw = await getOrCreateWallet(p.user_id);
          const pnb = pw.balance + c.wager_amount;
          await sb.from('user_wallets').update({ balance: pnb }).eq('user_id', p.user_id);
          await addWalletTransaction({
            user_id: p.user_id,
            type: 'p2p_refund',
            amount: c.wager_amount,
            balance_after: pnb,
            description: `Desafio expirado #${c.id.slice(0, 8)} — reembolsado`,
            reference_id: c.id,
          });
        }
      }
    }

    await sb.from('p2p_challenges').update({ status: 'expired' }).eq('id', c.id);
    count++;
  }

  return count;
}

// ============================================================
// GLOBAL ELO LEADERBOARD
// ============================================================

export interface GlobalLeaderboardEntry {
  user_id: string;
  username?: string;
  avatar_url?: string;
 team_name?: string;
 team_logo?: string;
 rating: number;
 total_matches: number;
 wins: number;
 karma_points: number;
 reputation_title: string;
}

export async function getGlobalLeaderboard(filters?: {
  game_id?: string;
  region?: string;
  limit?: number;
}): Promise<GlobalLeaderboardEntry[]> {
  let query = sb
    .from('esport_teams')
    .select('id, name, logo_url, rating, total_wins, total_tournaments')
    .order('rating', { ascending: false })
    .limit(filters?.limit || 100);

  const { data: teams, error } = await query;
  if (error) return [];

  return (teams || []).map((t: any) => ({
    user_id: t.owner_id,
    team_name: t.name,
    team_logo: t.logo_url,
    rating: t.rating || 1000,
    total_matches: t.total_tournaments || 0,
    wins: t.total_wins || 0,
    karma_points: 0,
    reputation_title: '',
  }));
}

export async function getPlayerLeaderboard(limit = 50): Promise<GlobalLeaderboardEntry[]> {
  const { data: reps } = await sb
    .from('user_reputation')
    .select('*')
    .order('karma_points', { ascending: false })
    .limit(limit);
  if (!reps) return [];

  const userIds = reps.map((r: any) => r.user_id);
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, username, avatar_url')
    .in('id', userIds);

  const profileMap: Record<string, any> = {};
  (profiles || []).forEach((p: any) => { profileMap[p.id] = p; });

  return reps.map((r: any) => {
    const profile = profileMap[r.user_id] || {};
    return {
      user_id: r.user_id,
      username: profile.username || 'Anonimo',
      avatar_url: profile.avatar_url,
      rating: r.karma_points,
      total_matches: r.total_matches,
      wins: r.total_wins,
      karma_points: r.karma_points,
      reputation_title: r.reputation_title,
    };
  });
}
