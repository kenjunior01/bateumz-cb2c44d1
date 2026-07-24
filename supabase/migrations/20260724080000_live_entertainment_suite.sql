-- ============================================================================
-- LIVE ENTERTAINMENT SUITE — Complete feature set for Bateu Live Platform
-- ============================================================================

-- ===================== 1. LIVE CHAT =====================
CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,                    -- for non-scheduled ad-hoc lives
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT NOT NULL DEFAULT 'Anônimo',
  avatar_url TEXT,
  message TEXT NOT NULL CHECK (char_length(message) > 0 AND char_length(message) <= 500),
  is_highlighted BOOLEAN DEFAULT FALSE,   -- tip/super chat
  tip_amount NUMERIC(10,2) DEFAULT 0,
  tip_currency TEXT DEFAULT 'USD',
  is_system BOOLEAN DEFAULT FALSE,       -- system messages (joined, left, etc)
  is_moderator BOOLEAN DEFAULT FALSE,
  is_banned BOOLEAN DEFAULT FALSE,
  reply_to_id UUID REFERENCES public.live_chat_messages(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_chat_live ON public.live_chat_messages(scheduled_live_id, created_at DESC);
CREATE INDEX idx_chat_code ON public.live_chat_messages(live_code, created_at DESC);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read chat messages" ON public.live_chat_messages FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert chat" ON public.live_chat_messages FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Owner or admin can ban" ON public.live_chat_messages FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = scheduled_live_id AND sl.business_user_id = auth.uid())
  OR public.is_superadmin(auth.uid())
);

-- ===================== 2. LIVE REACTIONS (floating emojis) =====================
CREATE TABLE IF NOT EXISTS public.live_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,
  emoji TEXT NOT NULL CHECK (char_length(emoji) <= 8),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT DEFAULT 'Anônimo',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_reactions_live ON public.live_reactions(scheduled_live_id, created_at DESC);

ALTER TABLE public.live_reactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read reactions" ON public.live_reactions FOR SELECT USING (true);
CREATE POLICY "Authenticated can react" ON public.live_reactions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===================== 3. LIVE TIPS / SUPER CHAT =====================
CREATE TABLE IF NOT EXISTS public.live_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  receiver_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount > 0),
  currency TEXT NOT NULL DEFAULT 'USD',
  message TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded', 'failed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_tips_receiver ON public.live_tips(receiver_id, created_at DESC);
CREATE INDEX idx_tips_live ON public.live_tips(scheduled_live_id, created_at DESC);

ALTER TABLE public.live_tips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see tip count" ON public.live_tips FOR SELECT USING (true);
CREATE POLICY "Authenticated can insert tip" ON public.live_tips FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Receiver can read own tips" ON public.live_tips FOR SELECT USING (receiver_id = auth.uid() OR sender_id = auth.uid());

-- ===================== 4. USER FOLLOWS =====================
CREATE TABLE IF NOT EXISTS public.user_follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(follower_id, following_id),
  CHECK (follower_id != following_id)
);

CREATE INDEX idx_follows_following ON public.user_follows(following_id);
CREATE INDEX idx_follows_follower ON public.user_follows(follower_id);

ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see follower count" ON public.user_follows FOR SELECT USING (true);
CREATE POLICY "Authenticated can follow" ON public.user_follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "User can unfollow" ON public.user_follows FOR DELETE USING (follower_id = auth.uid());

-- ===================== 5. FOLLOWER COUNTS MATERIALIZED VIEW =====================
CREATE OR REPLACE VIEW public.creator_stats AS
SELECT 
  p.user_id,
  p.display_name,
  p.avatar_url,
  p.company_name,
  COALESCE(fc.follower_count, 0) AS follower_count,
  COALESCE(lc.lives_count, 0) AS lives_count,
  COALESCE(lc.total_views, 0) AS total_views,
  COALESCE(tc.tips_total, 0) AS tips_total,
  COALESCE(lc.total_minutes, 0) AS total_live_minutes
FROM public.profiles p
LEFT JOIN (SELECT following_id, COUNT(*) AS follower_count FROM public.user_follows GROUP BY following_id) fc ON fc.following_id = p.user_id
LEFT JOIN (
  SELECT business_user_id, 
         COUNT(*) AS lives_count, 
         COALESCE(SUM(total_attendance), 0) AS total_views,
         COALESCE(SUM(EXTRACT(EPOCH FROM (COALESCE(ended_at, now()) - scheduled_at))/60), 0) AS total_minutes
  FROM public.scheduled_lives 
  GROUP BY business_user_id
) lc ON lc.business_user_id = p.user_id
LEFT JOIN (
  SELECT receiver_id, SUM(amount) AS tips_total FROM public.live_tips WHERE status = 'completed' GROUP BY receiver_id
) tc ON tc.receiver_id = p.user_id;

-- ===================== 6. LIVE NOTIFICATIONS =====================
CREATE TABLE IF NOT EXISTS public.live_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('live_started', 'new_follower', 'tip_received', 'achievement_unlocked', 'live_reminder', 'challenge_received', 'level_up')),
  title TEXT NOT NULL,
  body TEXT,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_notifs_user ON public.live_notifications(user_id, created_at DESC);
CREATE INDEX idx_notifs_unread ON public.live_notifications(user_id, is_read) WHERE NOT is_read;

ALTER TABLE public.live_notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications" ON public.live_notifications FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users update own notifications" ON public.live_notifications FOR UPDATE USING (user_id = auth.uid());

-- ===================== 7. CREATOR LEVELS & ACHIEVEMENTS =====================
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '🏆',
  category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('lives', 'engagement', 'social', 'games', 'monetization', 'milestone')),
  threshold INTEGER NOT NULL DEFAULT 1,
  reward_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read achievements" ON public.achievements FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, achievement_id)
);

ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see achievements" ON public.user_achievements FOR SELECT USING (true);

-- Creator levels
CREATE TABLE IF NOT EXISTS public.creator_levels (
  level INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  min_xp INTEGER NOT NULL,
  max_xp INTEGER NOT NULL,
  perks TEXT[] DEFAULT '{}',
  badge_color TEXT DEFAULT '#fbbf24',
  badge_icon TEXT DEFAULT '⭐'
);

INSERT INTO public.creator_levels VALUES
  (1, 'Iniciante', 0, 99, ARRAY['Criar lives', 'Chat básico'], '#9ca3af', '🌱'),
  (2, 'Rising Star', 100, 499, ARRAY['Reações customizadas', 'Overlay premium'], '#3b82f6', '⭐'),
  (3, 'Top Creator', 500, 1999, ARRAY['Tips ilimitados', 'Clips', 'Analytics avançado'], '#8b5cf6', '🔥'),
  (4, 'Superstar', 2000, 9999, ARRAY['Co-hosting', 'Badge verificado', 'Prioridade no feed'], '#f59e0b', '💎'),
  (5, 'Lenda', 10000, 999999, ARRAY['Badge exclusivo', 'Revenue share', 'Suporte prioritário'], '#ef4444', '👑');

-- ===================== 8. KAHOOT-STYLE MULTIPLAYER QUIZ =====================
CREATE TABLE IF NOT EXISTS public.live_quiz_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,
  business_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Quiz ao Vivo',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'question', 'showing_results', 'finished')),
  current_question_index INTEGER DEFAULT 0,
  time_per_question INTEGER DEFAULT 15,
  total_players INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_quiz_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read quiz" ON public.live_quiz_games FOR SELECT USING (true);
CREATE POLICY "Owner can manage quiz" ON public.live_quiz_games FOR ALL USING (business_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.live_quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.live_quiz_games(id) ON DELETE CASCADE,
  question TEXT NOT NULL,
  options TEXT[] NOT NULL CHECK (array_length(options, 1) >= 2 AND array_length(options, 1) <= 6),
  correct_index INTEGER NOT NULL CHECK (correct_index >= 0),
  image_url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  points INTEGER DEFAULT 1000
);

ALTER TABLE public.live_quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read questions" ON public.live_quiz_questions FOR SELECT USING (true);
CREATE POLICY "Owner can manage questions" ON public.live_quiz_questions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.live_quiz_games q WHERE q.id = quiz_id AND q.business_user_id = auth.uid())
);

CREATE TABLE IF NOT EXISTS public.live_quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.live_quiz_games(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.live_quiz_questions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT DEFAULT 'Anônimo',
  selected_index INTEGER NOT NULL,
  is_correct BOOLEAN GENERATED ALWAYS AS (selected_index = (SELECT correct_index FROM public.live_quiz_questions WHERE id = question_id)) STORED,
  time_taken_ms INTEGER DEFAULT 0,
  points_earned INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_quiz_answers ON public.live_quiz_answers(quiz_id, user_id);
CREATE INDEX idx_quiz_leaderboard ON public.live_quiz_answers(quiz_id, points_earned DESC);

ALTER TABLE public.live_quiz_answers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read answers" ON public.live_quiz_answers FOR SELECT USING (true);
CREATE POLICY "Authenticated can answer" ON public.live_quiz_answers FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ===================== 9. LIVE BINGO =====================
CREATE TABLE IF NOT EXISTS public.live_bingo_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,
  business_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Bingo ao Vivo',
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'drawing', 'finished')),
  pattern_type TEXT NOT NULL DEFAULT 'line' CHECK (pattern_type IN ('line', 'four_corners', 'full', 'x_pattern', 't_pattern')),
  drawn_numbers INTEGER[] DEFAULT '{}',
  total_players INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_bingo_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read bingo" ON public.live_bingo_games FOR SELECT USING (true);
CREATE POLICY "Owner can manage bingo" ON public.live_bingo_games FOR ALL USING (business_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.live_bingo_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bingo_id UUID NOT NULL REFERENCES public.live_bingo_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  display_name TEXT DEFAULT 'Anônimo',
  numbers INTEGER[] NOT NULL CHECK (array_length(numbers, 1) = 25),
  -- 5x5 grid stored as flat array, row-major, free space at index 12
  marked INTEGER[] DEFAULT '{}',
  has_bingo BOOLEAN DEFAULT FALSE,
  bingo_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_bingo_cards ON public.live_bingo_cards(bingo_id, user_id);

ALTER TABLE public.live_bingo_cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "User reads own card" ON public.live_bingo_cards FOR SELECT USING (user_id = auth.uid() OR EXISTS (
  SELECT 1 FROM public.live_bingo_games b WHERE b.id = bingo_id AND b.business_user_id = auth.uid()
));
CREATE POLICY "Authenticated can get card" ON public.live_bingo_cards FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "User updates own card" ON public.live_bingo_cards FOR UPDATE USING (user_id = auth.uid());

-- ===================== 10. CHALLENGE ROULETTE =====================
CREATE TABLE IF NOT EXISTS public.challenge_roulettes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'Roleta de Desafios',
  is_published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_roulettes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published roulettes" ON public.challenge_roulettes FOR SELECT USING (is_published = true OR business_user_id = auth.uid());
CREATE POLICY "Owner manages roulette" ON public.challenge_roulettes FOR ALL USING (business_user_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.challenge_roulette_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  roulette_id UUID NOT NULL REFERENCES public.challenge_roulettes(id) ON DELETE CASCADE,
  challenge_text TEXT NOT NULL,
  category TEXT DEFAULT 'geral' CHECK (category IN ('cantar', 'dancar', 'imitar', 'falar', 'fisico', 'engracado', 'verdade', 'ousado')),
  color TEXT DEFAULT '#8b5cf6',
  segment_number INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.challenge_roulette_segments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read segments of published" ON public.challenge_roulette_segments FOR SELECT USING (EXISTS (
  SELECT 1 FROM public.challenge_roulettes r WHERE r.id = roulette_id AND (r.is_published = true OR r.business_user_id = auth.uid())
));
CREATE POLICY "Owner manages segments" ON public.challenge_roulette_segments FOR ALL USING (
  EXISTS (SELECT 1 FROM public.challenge_roulettes r WHERE r.id = roulette_id AND r.business_user_id = auth.uid())
);

-- ===================== 11. LIVE CLIPS =====================
CREATE TABLE IF NOT EXISTS public.live_clips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  description TEXT,
  video_url TEXT,
  thumbnail_url TEXT,
  duration_seconds INTEGER DEFAULT 0,
  start_time_seconds INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  likes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_clips_live ON public.live_clips(scheduled_live_id);
CREATE INDEX idx_clips_creator ON public.live_clips(creator_id, created_at DESC);

ALTER TABLE public.live_clips ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read clips" ON public.live_clips FOR SELECT USING (true);
CREATE POLICY "Authenticated can create clip" ON public.live_clips FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Creator can update clip" ON public.live_clips FOR UPDATE USING (creator_id = auth.uid());

CREATE TABLE IF NOT EXISTS public.clip_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clip_id UUID NOT NULL REFERENCES public.live_clips(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(clip_id, user_id)
);

ALTER TABLE public.clip_likes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see likes" ON public.clip_likes FOR SELECT USING (true);
CREATE POLICY "Authenticated can like" ON public.clip_likes FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "User can unlike" ON public.clip_likes FOR DELETE USING (user_id = auth.uid());

-- ===================== 12. LIVE DUELS =====================
CREATE TABLE IF NOT EXISTS public.live_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  challenged_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'live', 'voting', 'finished', 'cancelled')),
  topic TEXT,
  challenger_votes INTEGER DEFAULT 0,
  challenged_votes INTEGER DEFAULT 0,
  winner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.live_duels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read duels" ON public.live_duels FOR SELECT USING (true);
CREATE POLICY "Authenticated can create duel" ON public.live_duels FOR INSERT WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "Participants can update duel" ON public.live_duels FOR UPDATE USING (challenger_id = auth.uid() OR challenged_id = auth.uid());

-- ===================== 13. BANNED USERS (per live) =====================
CREATE TABLE IF NOT EXISTS public.live_bans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  banned_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  banned_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(scheduled_live_id, banned_user_id)
);

ALTER TABLE public.live_bans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner can manage bans" ON public.live_bans FOR ALL USING (
  EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = scheduled_live_id AND sl.business_user_id = auth.uid())
);

-- ===================== 14. XP SYSTEM FOR CREATORS =====================
CREATE TABLE IF NOT EXISTS public.creator_xp (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.creator_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read XP" ON public.creator_xp FOR SELECT USING (true);

-- ===================== 15. FUNCTIONS =====================

-- Award XP to a creator and recalculate level
CREATE OR REPLACE FUNCTION public.award_creator_xp(p_user_id UUID, p_xp INTEGER, p_reason TEXT)
RETURNS TABLE(level INTEGER, total_xp INTEGER) AS $$
BEGIN
  INSERT INTO public.creator_xp (user_id, total_xp) 
  VALUES (p_user_id, p_xp)
  ON CONFLICT (user_id) DO UPDATE SET total_xp = creator_xp.total_xp + p_xp, updated_at = now();
  
  UPDATE public.creator_xp SET level = (
    SELECT COALESCE(MAX(level), 1) FROM public.creator_levels WHERE p_xp + total_xp - p_xp >= min_xp
  ) WHERE user_id = p_user_id;
  
  RETURN QUERY SELECT cx.level, cx.total_xp FROM public.creator_xp cx WHERE cx.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if user is banned from a live
CREATE OR REPLACE FUNCTION public.is_user_banned(p_scheduled_live_id UUID, p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (SELECT 1 FROM public.live_bans WHERE scheduled_live_id = p_scheduled_live_id AND banned_user_id = p_user_id);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Get live participant count (chat messages unique users last 5 min)
CREATE OR REPLACE FUNCTION public.live_participant_count(p_scheduled_live_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(DISTINCT user_id) FROM public.live_chat_messages 
    WHERE scheduled_live_id = p_scheduled_live_id 
    AND created_at > now() - INTERVAL '5 minutes'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ===================== 16. SEED ACHIEVEMENTS =====================
INSERT INTO public.achievements (key, title, description, icon, category, threshold, reward_points) VALUES
  ('first_live', 'Primeira Live', 'Fez a sua primeira live', '🎬', 'lives', 1, 50),
  ('five_lives', 'Veterano', 'Fez 5 lives', '🎥', 'lives', 5, 200),
  ('twenty_five_lives', 'Apresentador', 'Fez 25 lives', '📺', 'lives', 25, 500),
  ('hundred_lives', 'Lenda ao Vivo', 'Fez 100 lives', '👑', 'lives', 100, 2000),
  ('first_follower', 'Primeiro Fã', 'Recebeu o primeiro seguidor', '❤️', 'social', 1, 25),
  ('hundred_followers', 'Influencer', 'Atingiu 100 seguidores', '📈', 'social', 100, 300),
  ('thousand_followers', 'Estrela', 'Atingiu 1000 seguidores', '⭐', 'social', 1000, 1000),
  ('first_tip', 'Primeira Gorjeta', 'Recebeu a primeira gorjeta', '💰', 'monetization', 1, 50),
  ('tips_100', 'Bem Pago', 'Acumulou $100 em gorjetas', '💎', 'monetization', 100, 500),
  ('tips_1000', 'Top Earner', 'Acumulou $1000 em gorjetas', '🏆', 'monetization', 1000, 2000),
  ('quiz_host_10', 'Mestre do Quiz', 'Hospedou 10 quizzes ao vivo', '🧠', 'games', 10, 300),
  ('bingo_host_5', 'Bingo Master', 'Hospedou 5 bingos ao vivo', '🎱', 'games', 5, 300),
  ('streak_7', 'Dedicação', '7 dias seguidos de live', '🔥', 'engagement', 7, 500),
  ('streak_30', 'Inabalável', '30 dias seguidos de live', '💪', 'engagement', 30, 2000),
  ('duel_winner', 'Campeão de Duels', 'Venceu 5 duels', '⚔️', 'engagement', 5, 500)
ON CONFLICT (key) DO NOTHING;

-- ===================== 17. LIVE PRESENCE (who is watching) =====================
CREATE TABLE IF NOT EXISTS public.live_presence (
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  scheduled_live_id UUID REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  live_code TEXT,
  last_heartbeat TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (user_id, COALESCE(scheduled_live_id, '00000000-0000-0000-0000-000000000000'::uuid))
);

CREATE INDEX idx_presence_live ON public.live_presence(scheduled_live_id, last_heartbeat);

ALTER TABLE public.live_presence ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can see viewer count" ON public.live_presence FOR SELECT USING (true);
CREATE POLICY "Authenticated can update presence" ON public.live_presence FOR INSERT ON CONFLICT DO UPDATE SET last_heartbeat = now();
CREATE POLICY "User can remove presence" ON public.live_presence FOR DELETE USING (user_id = auth.uid());

-- Clean stale presence (run via cron)
CREATE OR REPLACE FUNCTION public.clean_stale_presence()
RETURNS INTEGER AS $$
BEGIN
  DELETE FROM public.live_presence WHERE last_heartbeat < now() - INTERVAL '2 minutes';
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
