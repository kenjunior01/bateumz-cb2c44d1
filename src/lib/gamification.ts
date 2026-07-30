/**
 * Bateu Live - Gamification System
 * Creator levels, XP, achievements, streaks, and rewards.
 */
import { supabase } from "@/integrations/supabase/client";

const sb: any = supabase;

// ===================== TYPES =====================
export interface CreatorLevel {
  level: number;
  title: string;
  titleEn: string;
  min_xp: number;
  perks: string[];
  badge_color: string;
  badge_emoji: string;
}

export interface XPEvent {
  type: 'live_minute' | 'chat_message' | 'reaction' | 'tip_received' | 'tip_sent' | 'game_played' | 'game_won' | 'bingo_win' | 'quiz_correct' | 'follower_gained' | 'clip_created' | 'streak_bonus' | 'duel_win' | 'gift_received' | 'live_completed';
  xp: number;
}

export interface UserStreak {
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_live_date: string;
}

export interface AchievementUnlock {
  achievement_id: string;
  unlocked_at: string;
  achievement: {
    key: string;
    title: string;
    description: string;
    icon: string;
    category: string;
    reward_points: number;
  };
}

// ===================== LEVELS =====================
export const CREATOR_LEVELS: CreatorLevel[] = [
  { level: 1, title: "Iniciante", titleEn: "Newcomer", min_xp: 0, perks: ["Chat ilimitado"], badge_color: "#9CA3AF", badge_emoji: "🌱" },
  { level: 2, title: "Entusiasta", titleEn: "Enthusiast", min_xp: 100, perks: ["Reacções personalizadas"], badge_color: "#60A5FA", badge_emoji: "⭐" },
  { level: 3, title: "Regular", titleEn: "Regular", min_xp: 500, perks: ["Emoji custom no chat"], badge_color: "#34D399", badge_emoji: "🔥" },
  { level: 4, title: "Popular", titleEn: "Popular", min_xp: 1500, perks: ["Chat destacado", "Badge VIP"], badge_color: "#FBBF24", badge_emoji: "👑" },
  { level: 5, title: "Estrela", titleEn: "Star", min_xp: 5000, perks: ["Avatar animado", "Prioridade no chat"], badge_color: "#F472B6", badge_emoji: "💫" },
  { level: 6, title: "Lenda", titleEn: "Legend", min_xp: 15000, perks: ["Efeitos especiais", "Co-host"], badge_color: "#A78BFA", badge_emoji: "🏆" },
  { level: 7, title: "Ídolo", titleEn: "Idol", min_xp: 50000, perks: ["Live em destaque", "Badge exclusivo"], badge_color: "#F87171", badge_emoji: "🦸" },
  { level: 8, title: "Mítico", titleEn: "Mythic", min_xp: 150000, perks: ["Canal verificado", "Revenue split premium"], badge_color: "#F59E0B", badge_emoji: "🏆" },
  { level: 9, title: "Lendário", titleEn: "Legendary", min_xp: 500000, perks: ["Programa de parceiros", "White label"], badge_color: "#EF4444", badge_emoji: "🔴" },
  { level: 10, title: "Goat", titleEn: "GOAT", min_xp: 1500000, perks: ["Todos os perks", "Badge GOAT", "Revenue máximo"], badge_color: "#FFD700", badge_emoji: "🐐" },
];

// ===================== XP MAPPING =====================
export const XP_EVENTS: Record<XPEvent['type'], number> = {
  live_minute: 2,
  chat_message: 1,
  reaction: 1,
  tip_received: 50,
  tip_sent: 5,
  game_played: 10,
  game_won: 50,
  bingo_win: 100,
  quiz_correct: 15,
  follower_gained: 20,
  clip_created: 5,
  streak_bonus: 25,
  duel_win: 75,
  gift_received: 10,
  live_completed: 100,
};

// ===================== ACHIEVEMENT DEFINITIONS =====================
export const ACHIEVEMENTS = [
  { key: 'first_live', title: 'Primeira Live', description: 'Faça sua primeira live', icon: '🎬', category: 'live', threshold: 1, reward_points: 50 },
  { key: 'live_5', title: 'Apresentador', description: 'Faça 5 lives', icon: '🎤', category: 'live', threshold: 5, reward_points: 200 },
  { key: 'live_25', title: 'Veterano', description: 'Faça 25 lives', icon: '🏆', category: 'live', threshold: 25, reward_points: 1000 },
  { key: 'live_100', title: '100 Lives', description: 'Faça 100 lives', icon: '💎', category: 'live', threshold: 100, reward_points: 5000 },
  { key: 'followers_10', title: 'Crescendo', description: 'Chegue a 10 seguidores', icon: '👥', category: 'social', threshold: 10, reward_points: 50 },
  { key: 'followers_100', title: 'Influencer', description: 'Chegue a 100 seguidores', icon: '⭐', category: 'social', threshold: 100, reward_points: 500 },
  { key: 'followers_1000', title: 'Famoso', description: 'Chegue a 1000 seguidores', icon: '🌟', category: 'social', threshold: 1000, reward_points: 5000 },
  { key: 'tips_1', title: 'Primeira Gorjeta', description: 'Receba sua primeira gorjeta', icon: '💰', category: 'money', threshold: 1, reward_points: 25 },
  { key: 'tips_100', title: 'Dinheiro Vivo', description: 'Receba $100 em gorjetas', icon: '💎', category: 'money', threshold: 100, reward_points: 1000 },
  { key: 'tips_1000', title: 'Magnata', description: 'Receba $1000 em gorjetas', icon: '🤑', category: 'money', threshold: 1000, reward_points: 10000 },
  { key: 'game_1', title: 'Jogador', description: 'Jogue seu primeiro jogo ao vivo', icon: '🎮', category: 'games', threshold: 1, reward_points: 25 },
  { key: 'game_50', title: 'Gamer', description: 'Jogue 50 jogos ao vivo', icon: '🕹️', category: 'games', threshold: 50, reward_points: 500 },
  { key: 'bingo_win', title: 'Bingo!', description: 'Vença um bingo ao vivo', icon: '🎰', category: 'games', threshold: 1, reward_points: 200 },
  { key: 'streak_3', title: 'Consistência', description: '3 dias seguidos de live', icon: '🔥', category: 'streak', threshold: 3, reward_points: 150 },
  { key: 'streak_7', title: 'Semana Completa', description: '7 dias seguidos de live', icon: '⚡', category: 'streak', threshold: 7, reward_points: 500 },
  { key: 'streak_30', title: 'Inabalável', description: '30 dias seguidos de live', icon: '🏔️', category: 'streak', threshold: 30, reward_points: 5000 },
  { key: 'chat_100', title: 'Tagarela', description: 'Envie 100 mensagens no chat', icon: '💬', category: 'chat', threshold: 100, reward_points: 100 },
  { key: 'chat_1000', title: 'Comunicador', description: 'Envie 1000 mensagens no chat', icon: '📣', category: 'chat', threshold: 1000, reward_points: 500 },
];

// ===================== HELPERS =====================
export function getLevelForXP(totalXP: number): CreatorLevel {
 let level = CREATOR_LEVELS[0];
 for (const l of CREATOR_LEVELS) {
 if (totalXP >= l.min_xp) level = l;
 else break;
 }
 return level;
}

export function getXPProgress(totalXP: number): { current: number; needed: number; percent: number } {
 const currentLevel = getLevelForXP(totalXP);
 const nextLevel = CREATOR_LEVELS.find((l) => l.level === currentLevel.level + 1);
 if (!nextLevel) return { current: totalXP, needed: totalXP, percent: 100 };
 const xpInLevel = totalXP - currentLevel.min_xp;
 const xpNeeded = nextLevel.min_xp - currentLevel.min_xp;
 return { current: xpInLevel, needed: xpNeeded, percent: Math.min(100, Math.round((xpInLevel / xpNeeded) * 100)) };
}

export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 3.0;
  if (streak >= 7) return 2.0;
  if (streak >= 3) return 1.5;
  return 1.0;
}

// ===================== API FUNCTIONS =====================
export async function awardXP(userId: string, eventType: XPEvent['type']) {
  const baseXP = XP_EVENTS[eventType];
  const { data: streak } = await sb
  .from('user_streaks')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

  const multiplier = streak ? getStreakMultiplier(streak.current_streak) : 1;
  const totalXP = Math.floor(baseXP * multiplier);

  await sb.rpc('award_xp' as any, { p_user_id: userId, p_amount: totalXP, p_reason: eventType } as any).catch(() => {});
  return { baseXP, multiplier, totalXP };
}

export async function getUserGamification(userId: string) {
  const [xpRes, achievementsRes, streakRes] = await Promise.all([
    sb.from('creator_xp').select('*').eq('user_id', userId).maybeSingle(),
    sb.from('user_achievements').select('*, achievement:achievements(*)').eq('user_id', userId),
    sb.from('user_streaks').select('*').eq('user_id', userId).maybeSingle(),
  ]);

  const totalXP = (xpRes.data as any)?.total_xp || 0;
  return {
    totalXP,
    level: getLevelForXP(totalXP),
    progress: getXPProgress(totalXP),
    achievements: (achievementsRes.data as AchievementUnlock[]) || [],
    streak: streakRes.data as UserStreak | null,
  };
}

export async function checkAndUnlockAchievements(userId: string, stats: Record<string, number>) {
  const { data: existing } = await sb
  .from('user_achievements')
  .select('achievement_id')
  .eq('user_id', userId);

  const existingKeys = new Set((existing || []).map((a: any) => a.achievement_id));
  const newUnlocks: typeof ACHIEVEMENTS = [];

  for (const ach of ACHIEVEMENTS) {
    if (existingKeys.has(ach.key)) continue;
    const statValue = stats[ach.key] || 0;
    if (statValue >= ach.threshold) {
      newUnlocks.push(ach);
      await sb.from('user_achievements').insert({
        user_id: userId,
        achievement_id: ach.key,
      }).catch(() => {});
    }
  }

  return newUnlocks;
}

export async function updateStreak(userId: string) {
  const today = new Date().toISOString().split('T')[0];
  const { data: streak } = await sb
  .from('user_streaks')
  .select('*')
  .eq('user_id', userId)
  .maybeSingle();

  if (!streak) {
    await sb.from('user_streaks').insert({
      user_id: userId,
      current_streak: 1,
      longest_streak: 1,
      last_live_date: today,
    });
    return { streak: 1, isBonus: false };
  }

  const lastDate = streak.last_live_date;
  const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

  if (lastDate === today) {
    return { streak: streak.current_streak, isBonus: false };
  }

  if (lastDate === yesterday) {
    const newStreak = streak.current_streak + 1;
    const isBonus = newStreak > 1;
    await sb
      .from('user_streaks')
      .update({
        current_streak: newStreak,
        longest_streak: Math.max(streak.longest_streak, newStreak),
        last_live_date: today,
      })
      .eq('user_id', userId);
    return { streak: newStreak, isBonus };
  }

  // Streak broken
  await sb
    .from('user_streaks')
    .update({ current_streak: 1, last_live_date: today })
    .eq('user_id', userId);
  return { streak: 1, isBonus: false };
}

export async function getLeaderboard(type: 'xp' | 'followers' | 'tips' = 'xp', limit = 20) {
  if (type === 'xp') {
    const { data } = await sb
      .from('creator_xp')
      .select('*, profiles(display_name, avatar_url, company_name)')
      .order('total_xp', { ascending: false })
      .limit(limit);
    return data || [];
  }
  if (type === 'followers') {
    const { data } = await sb
      .from('creator_stats')
      .select('*, profiles(display_name, avatar_url, company_name)')
      .order('follower_count', { ascending: false })
      .limit(limit);
    return data || [];
  }
  // tips
  const { data } = await sb
    .from('creator_stats')
    .select('*, profiles(display_name, avatar_url, company_name)')
    .order('tips_total', { ascending: false })
    .limit(limit);
  return data || [];
}
