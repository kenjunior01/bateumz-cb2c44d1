/**
 * Bateu Live Platform — Data layer for all live entertainment features.
 * Chat, Reactions, Tips, Follows, Quiz, Bingo, Achievements, Clips, Duels.
 */
import { supabase } from "@/integrations/supabase/client";

// ===================== TYPES =====================
export interface ChatMessage {
  id: string;
  scheduled_live_id: string | null;
  live_code: string | null;
  user_id: string | null;
  display_name: string;
  avatar_url: string | null;
  message: string;
  is_highlighted: boolean;
  tip_amount: number;
  is_system: boolean;
  is_moderator: boolean;
  reply_to_id: string | null;
  created_at: string;
}

export interface LiveReaction {
  id: string;
  emoji: string;
  display_name: string;
  created_at: string;
}

export interface LiveTip {
  id: string;
  sender_id: string;
  receiver_id: string;
  amount: number;
  currency: string;
  message: string | null;
  status: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
}

export interface CreatorStat {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  company_name: string | null;
  follower_count: number;
  lives_count: number;
  total_views: number;
  tips_total: number;
  total_live_minutes: number;
}

export interface QuizGame {
  id: string;
  scheduled_live_id: string | null;
  live_code: string | null;
  business_user_id: string | null;
  title: string;
  status: "waiting" | "question" | "showing_results" | "finished";
  current_question_index: number;
  time_per_question: number;
  total_players: number;
}

export interface QuizQuestion {
  id: string;
  quiz_id: string;
  question: string;
  options: string[];
  correct_index: number;
  image_url: string | null;
  position: number;
  points: number;
}

export interface QuizAnswer {
  id: string;
  quiz_id: string;
  question_id: string;
  user_id: string | null;
  display_name: string;
  selected_index: number;
  is_correct: boolean;
  time_taken_ms: number;
  points_earned: number;
  created_at: string;
}

export interface BingoGame {
  id: string;
  scheduled_live_id: string | null;
  live_code: string | null;
  business_user_id: string | null;
  title: string;
  status: "waiting" | "drawing" | "finished";
  pattern_type: "line" | "four_corners" | "full" | "x_pattern" | "t_pattern";
  drawn_numbers: number[];
  total_players: number;
}

export interface BingoCard {
  id: string;
  bingo_id: string;
  user_id: string | null;
  display_name: string;
  numbers: number[];
  marked: number[];
  has_bingo: boolean;
}

export interface Achievement {
  id: string;
  key: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  threshold: number;
  reward_points: number;
}

export interface UserAchievement {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  achievement?: Achievement;
}

export interface CreatorLevel {
  level: number;
  title: string;
  min_xp: number;
  max_xp: number;
  perks: string[];
  badge_color: string;
  badge_icon: string;
}

export interface LiveClip {
  id: string;
  scheduled_live_id: string;
  creator_id: string;
  title: string | null;
  description: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number;
  views_count: number;
  likes_count: number;
  created_at: string;
}

export interface LiveDuel {
  id: string;
  challenger_id: string;
  challenged_id: string;
  status: "pending" | "accepted" | "live" | "voting" | "finished" | "cancelled";
  topic: string | null;
  challenger_votes: number;
  challenged_votes: number;
  winner_id: string | null;
  created_at: string;
}

export interface LiveNotification {
  id: string;
  type: string;
  title: string;
  body: string | null;
  data: Record<string, unknown>;
  is_read: boolean;
  created_at: string;
}

// ===================== CHAT =====================
export async function sendChatMessage(opts: {
  scheduled_live_id?: string;
  live_code?: string;
  message: string;
  replyToId?: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anônimo";
  const avatarUrl = user?.user_metadata?.avatar_url || null;

  return supabase.from("live_chat_messages").insert({
    scheduled_live_id: opts.scheduled_live_id || null,
    live_code: opts.live_code || null,
    user_id: user?.id || null,
    display_name: displayName,
    avatar_url: avatarUrl,
    message: opts.message.slice(0, 500),
    reply_to_id: opts.replyToId || null,
  }).select().single();
}

export function subscribeChat(
  liveId: string,
  opts: { scheduled_live_id?: string; live_code?: string },
  onMessage: (msg: ChatMessage) => void
) {
  const ch = supabase
    .channel(`chat:${liveId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_chat_messages",
        filter: opts.scheduled_live_id
          ? `scheduled_live_id=eq.${opts.scheduled_live_id}`
          : undefined },
      (payload) => { onMessage(payload.new as ChatMessage); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

export async function fetchChatHistory(opts: { scheduled_live_id?: string; live_code?: string; limit?: number }) {
  const q = supabase
    .from("live_chat_messages")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(opts.limit || 50);

  if (opts.scheduled_live_id) q.eq("scheduled_live_id", opts.scheduled_live_id);
  if (opts.live_code) q.eq("live_code", opts.live_code);
  return q;
}

export async function banUser(scheduledLiveId: string, userId: string, reason?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("live_bans").insert({
    scheduled_live_id: scheduledLiveId,
    banned_user_id: userId,
    banned_by: user?.id,
    reason: reason || null,
  });
}

export async function deleteChatMessage(messageId: string) {
  return supabase.from("live_chat_messages").delete().eq("id", messageId);
}

// ===================== REACTIONS =====================
export async function sendReaction(opts: {
  scheduled_live_id?: string;
  live_code?: string;
  emoji: string;
}) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("live_reactions").insert({
    scheduled_live_id: opts.scheduled_live_id || null,
    live_code: opts.live_code || null,
    user_id: user?.id || null,
    display_name: user?.user_metadata?.display_name || "Anônimo",
    emoji: opts.emoji,
  });
}

export function subscribeReactions(
  liveId: string,
  opts: { scheduled_live_id?: string; live_code?: string },
  onReaction: (r: LiveReaction) => void
) {
  const ch = supabase
    .channel(`reactions:${liveId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_reactions",
        filter: opts.scheduled_live_id
          ? `scheduled_live_id=eq.${opts.scheduled_live_id}`
          : undefined },
      (payload) => { onReaction(payload.new as LiveReaction); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== TIPS =====================
export async function createTipOrder(receiverId: string, amount: number) {
  return supabase.functions.invoke("paypal-create-order", {
    body: { type: "tip", receiver_id: receiverId, amount, currency: "USD" },
  });
}

export async function fetchLiveTips(scheduledLiveId: string) {
  return supabase
    .from("live_tips")
    .select("*, profiles!live_tips_sender_id_fkey(display_name, avatar_url)")
    .eq("scheduled_live_id", scheduledLiveId)
    .eq("status", "completed")
    .order("amount", { ascending: false });
}

export function subscribeTips(
  liveId: string,
  onTip: (tip: LiveTip) => void
) {
  const ch = supabase
    .channel(`tips:${liveId}`)
    .on(
      "postgres_changes",
      { event: "INSERT", schema: "public", table: "live_tips",
        filter: `scheduled_live_id=eq.${liveId}` },
      (payload) => { onTip(payload.new as LiveTip); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== FOLLOWS =====================
export async function toggleFollow(userId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .maybeSingle();

  if (existing) {
    return supabase.from("user_follows").delete().eq("id", existing.id);
  } else {
    return supabase.from("user_follows").insert({ follower_id: user.id, following_id: userId });
  }
}

export async function isFollowing(userId: string): Promise<boolean> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("user_follows")
    .select("id")
    .eq("follower_id", user.id)
    .eq("following_id", userId)
    .maybeSingle();
  return !!data;
}

export async function getFollowersCount(userId: string): Promise<number> {
  const { count } = await supabase
    .from("user_follows")
    .select("id", { count: "exact", head: true })
    .eq("following_id", userId);
  return count ?? 0;
}

export function subscribeFollowers(userId: string, onCount: (n: number) => void) {
  const ch = supabase
    .channel(`followers:${userId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "user_follows", filter: `following_id=eq.${userId}` },
      async () => { const c = await getFollowersCount(userId); onCount(c); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== CREATOR STATS =====================
export async function getCreatorStats(userId: string) {
  return supabase.from("creator_stats").select("*").eq("user_id", userId).maybeSingle();
}

export async function getTopCreators(limit = 20) {
  return supabase.from("creator_stats").select("*").order("follower_count", { ascending: false }).limit(limit);
}

// ===================== QUIZ =====================
export async function createQuizGame(opts: { scheduled_live_id?: string; live_code?: string; title?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("live_quiz_games").insert({
    scheduled_live_id: opts.scheduled_live_id || null,
    live_code: opts.live_code || null,
    business_user_id: user?.id,
    title: opts.title || "Quiz ao Vivo",
  }).select().single();
}

export async function addQuizQuestion(quizId: string, question: string, options: string[], correctIndex: number, position: number) {
  return supabase.from("live_quiz_questions").insert({
    quiz_id: quizId, question, options, correct_index: correctIndex, position,
  }).select().single();
}

export async function setQuizStatus(quizId: string, status: QuizGame["status"]) {
  return supabase.from("live_quiz_games").update({ status }).eq("id", quizId);
}

export async function submitQuizAnswer(quizId: string, questionId: string, selectedIndex: number, timeTakenMs: number) {
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anônimo";

  // Calculate points: faster = more points, correct = base points
  const { data: q } = await supabase.from("live_quiz_questions").select("points, correct_index").eq("id", questionId).single();
  const isCorrect = selectedIndex === q?.correct_index;
  const timeBonus = isCorrect ? Math.max(0, Math.floor((1 - timeTakenMs / 15000) * 500)) : 0;
  const pointsEarned = isCorrect ? (q?.points || 1000) + timeBonus : 0;

  const { data, error } = await supabase.from("live_quiz_answers").insert({
    quiz_id: quizId, question_id: questionId, user_id: user?.id,
    display_name: displayName, selected_index: selectedIndex,
    time_taken_ms: timeTakenMs, points_earned: pointsEarned,
  }).select().single();

  // Update player count
  if (!error) {
    await supabase.rpc("update_total_players" as any, { p_quiz_id: quizId } as any).catch(() => {});
  }

  return { data, error };
}

export async function getQuizLeaderboard(quizId: string, limit = 10) {
  const { data } = await supabase
    .from("live_quiz_answers")
    .select("display_name, user_id, sum(points_earned) as total_points, count(*) as correct_count")
    .eq("quiz_id", quizId)
    .eq("is_correct", true)
    .group("display_name, user_id")
    .order("total_points", { ascending: false })
    .limit(limit);
  return data || [];
}

export function subscribeQuiz(quizId: string, onUpdate: (game: QuizGame) => void) {
  const ch = supabase
    .channel(`quiz:${quizId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_quiz_games", filter: `id=eq.${quizId}` },
      (payload) => { onUpdate(payload.new as QuizGame); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== BINGO =====================
export function generateBingoCard(): number[] {
  const card: number[] = new Array(25).fill(0);
  // B: 1-15, I: 16-30, N: 31-45, G: 46-60, O: 61-75
  const ranges = [[1,15],[16,30],[31,45],[46,60],[61,75]];
  for (let col = 0; col < 5; col++) {
    const [min, max] = ranges[col];
    const nums = new Set<number>();
    while (nums.size < 5) nums.add(Math.floor(Math.random() * (max - min + 1)) + min);
    const colNums = [...nums];
    for (let row = 0; row < 5; row++) {
      if (col === 2 && row === 2) continue; // FREE space
      card[row * 5 + col] = colNums[row];
    }
  }
  card[12] = 0; // Free space
  return card;
}

export async function createBingoGame(opts: { scheduled_live_id?: string; live_code?: string; title?: string; pattern_type?: BingoGame["pattern_type"] }) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("live_bingo_games").insert({
    scheduled_live_id: opts.scheduled_live_id || null,
    live_code: opts.live_code || null,
    business_user_id: user?.id,
    title: opts.title || "Bingo ao Vivo",
    pattern_type: opts.pattern_type || "line",
  }).select().single();
}

export async function joinBingo(bingoId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  const displayName = user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Anônimo";
  const numbers = generateBingoCard();

  return supabase.from("live_bingo_cards").insert({
    bingo_id: bingoId, user_id: user?.id, display_name: displayName, numbers, marked: [],
  }).select().single();
}

export async function drawBingoNumber(bingoId: string) {
  const { data: game } = await supabase.from("live_bingo_games").select("drawn_numbers").eq("id", bingoId).single();
  if (!game) return { error: "Game not found" };

  const drawn = game.drawn_numbers || [];
  const available = Array.from({ length: 75 }, (_, i) => i + 1).filter(n => !drawn.includes(n));
  if (available.length === 0) return { error: "No more numbers" };

  const num = available[Math.floor(Math.random() * available.length)];
  const newDrawn = [...drawn, num].sort((a, b) => a - b);

  return supabase.from("live_bingo_games").update({
    drawn_numbers: newDrawn, status: "drawing",
  }).eq("id", bingoId).select().single();
}

export async function markBingoNumber(cardId: string, number: number) {
  const { data: card } = await supabase.from("live_bingo_cards").select("marked, bingo_id, numbers").eq("id", cardId).single();
  if (!card || !card.numbers.includes(number)) return { error: "Invalid" };

  const newMarked = [...new Set([...(card.marked || []), number])];
  return supabase.from("live_bingo_cards").update({ marked: newMarked }).eq("id", cardId);
}

export function checkBingo(card: BingoCard, drawnNumbers: number[], pattern: BingoGame["pattern_type"]): boolean {
  const grid: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));
  for (let i = 0; i < 25; i++) {
    if (i === 12) { grid[2][2] = true; continue; } // Free
    grid[Math.floor(i / 5)][i % 5] = drawnNumbers.includes(card.numbers[i]);
  }

  const checkLine = (r: number) => grid[r].every(Boolean);
  const checkCol = (c: number) => grid.every(row => row[c]);
  const checkDiag = () => { for (let i = 0; i < 5; i++) if (!grid[i][i]) return false; return true; };
  const checkAntiDiag = () => { for (let i = 0; i < 5; i++) if (!grid[i][4 - i]) return false; return true; };

  switch (pattern) {
    case "line":
      return grid.some(row => row.every(Boolean)) || [0,1,2,3,4].some(c => checkCol(c));
    case "four_corners":
      return grid[0][0] && grid[0][4] && grid[4][0] && grid[4][4];
    case "full":
      return grid.every(row => row.every(Boolean));
    case "x_pattern":
      return checkDiag() && checkAntiDiag();
    case "t_pattern":
      return grid[0].every(Boolean) && checkCol(2);
    default:
      return false;
  }
}

export function subscribeBingo(bingoId: string, onUpdate: (game: BingoGame) => void) {
  const ch = supabase
    .channel(`bingo:${bingoId}`)
    .on("postgres_changes", { event: "UPDATE", schema: "public", table: "live_bingo_games", filter: `id=eq.${bingoId}` },
      (payload) => { onUpdate(payload.new as BingoGame); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== ACHIEVEMENTS =====================
export async function getAchievements() {
  return supabase.from("achievements").select("*").order("category");
}

export async function getUserAchievements(userId: string) {
  return supabase
    .from("user_achievements")
    .select("*, achievement:achievements(*)")
    .eq("user_id", userId);
}

// ===================== CREATOR LEVELS =====================
export async function getCreatorLevels() {
  return supabase.from("creator_levels").select("*").order("level");
}

export async function getCreatorXP(userId: string) {
  return supabase.from("creator_xp").select("*").eq("user_id", userId).maybeSingle();
}

// ===================== CLIPS =====================
export async function createClip(opts: { scheduled_live_id: string; title?: string; description?: string; video_url?: string; thumbnail_url?: string; duration_seconds?: number }) {
  const { data: { user } } = await supabase.auth.getUser();
  return supabase.from("live_clips").insert({
    ...opts, creator_id: user?.id,
  }).select().single();
}

export async function getLiveClips(scheduledLiveId: string) {
  return supabase.from("live_clips").select("*").eq("scheduled_live_id", scheduledLiveId).order("views_count", { ascending: false });
}

export async function getTrendingClips(limit = 20) {
  return supabase.from("live_clips").select("*").order("views_count", { ascending: false }).limit(limit);
}

export async function toggleClipLike(clipId: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: existing } = await supabase.from("clip_likes").select("id").eq("clip_id", clipId).eq("user_id", user.id).maybeSingle();
  if (existing) {
    await supabase.from("clip_likes").delete().eq("id", existing.id);
    await supabase.from("live_clips").update({ likes_count: 0 }).eq("id", clipId); // decrement via RPC ideally
  } else {
    await supabase.from("clip_likes").insert({ clip_id: clipId, user_id: user.id });
    await supabase.from("live_clips").update({ likes_count: 0 }).eq("id", clipId);
  }
}

// ===================== NOTIFICATIONS =====================
export async function getNotifications() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("live_notifications")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
  return data || [];
}

export async function markNotificationRead(id: string) {
  return supabase.from("live_notifications").update({ is_read: true }).eq("id", id);
}

export async function markAllNotificationsRead() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  return supabase.from("live_notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
}

export async function getUnreadNotificationCount(): Promise<number> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return 0;
  const { count } = await supabase
    .from("live_notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .eq("is_read", false);
  return count ?? 0;
}

export function subscribeNotifications(onNotif: (n: LiveNotification) => void) {
  const { data: { user } } = supabase.auth.getUser();
  if (!user) return () => {};
  const ch = supabase
    .channel(`notifs:${user.id}`)
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "live_notifications", filter: `user_id=eq.${user.id}` },
      (payload) => { onNotif(payload.new as LiveNotification); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== PRESENCE =====================
export async function updatePresence(opts: { scheduled_live_id?: string; live_code?: string }) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  return supabase.from("live_presence").upsert({
    user_id: user.id,
    scheduled_live_id: opts.scheduled_live_id || null,
    live_code: opts.live_code || null,
    last_heartbeat: new Date().toISOString(),
  }, { onConflict: "user_id,scheduled_live_id" });
}

export async function getLiveViewerCount(scheduledLiveId: string): Promise<number> {
  const { count } = await supabase
    .from("live_presence")
    .select("user_id", { count: "exact", head: true })
    .eq("scheduled_live_id", scheduledLiveId)
    .gt("last_heartbeat", new Date(Date.now() - 120000).toISOString());
  return count ?? 0;
}

export function subscribeViewerCount(scheduledLiveId: string, onCount: (n: number) => void) {
  const ch = supabase
    .channel(`presence:${scheduledLiveId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "live_presence", filter: `scheduled_live_id=eq.${scheduledLiveId}` },
      async () => { const c = await getLiveViewerCount(scheduledLiveId); onCount(c); }
    )
    .subscribe();
  return () => { supabase.removeChannel(ch); };
}

// ===================== ACTIVE LIVES =====================
export async function getActiveLives() {
  return supabase
    .from("scheduled_lives")
    .select("id, title, slug, scheduled_at, status, business_user_id, profiles!scheduled_lives_business_user_id_fkey(display_name, avatar_url, company_name)")
    .eq("status", "live")
    .order("scheduled_at", { ascending: false });
}

// ===================== DUELS =====================
export async function createDuel(challengedId: string, topic?: string) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  return supabase.from("live_duels").insert({
    challenger_id: user.id, challenged_id, topic,
    expires_at: new Date(Date.now() + 86400000).toISOString(),
  }).select().single();
}

export async function voteDuel(duelId: string, voteFor: "challenger" | "challenged") {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const { data: duel } = await supabase.from("live_duels").select("*").eq("id", duelId).single();
  if (!duel) return;
  if (voteFor === "challenger") {
    await supabase.from("live_duels").update({ challenger_votes: (duel.challenger_votes || 0) + 1 }).eq("id", duelId);
  } else {
    await supabase.from("live_duels").update({ challenged_votes: (duel.challenged_votes || 0) + 1 }).eq("id", duelId);
  }
}
