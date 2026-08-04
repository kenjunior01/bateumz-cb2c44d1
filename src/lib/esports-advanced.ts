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
