-- =============================================
-- BATEU MZ - Migration: Analytics, Branding, Overlay
-- Execute this in Supabase SQL Editor
-- =============================================

-- 1. COMPANY BRANDING (customizacao de cores/fundos para jogos e lives)
CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_slogan TEXT,
  company_logo_url TEXT,
  background_image_url TEXT,
  primary_color TEXT DEFAULT '#fbbf24',
  secondary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#8b5cf6',
  background_color TEXT DEFAULT '#0a0a0a',
  text_color TEXT DEFAULT '#ffffff',
  overlay_style TEXT DEFAULT 'modern' CHECK (overlay_style IN ('modern', 'minimal', 'neon', 'classic', 'gaming')),
  font_family TEXT DEFAULT 'default',
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. GAME SESSIONS (historico completo de todos os jogos)
CREATE TABLE IF NOT EXISTS public.game_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  live_code TEXT,
  game_type TEXT NOT NULL CHECK (game_type IN ('wheel', 'millionaire', 'quiz', 'tap', 'emoji', 'keyword', 'mystery', 'bingo', 'kahoot', 'truthordare', 'challenge', 'hotpotato', 'guessEmoji', 'quickdraw', 'chaos', 'other')),
  game_id UUID,
  game_name TEXT NOT NULL,
  player_name TEXT,
  player_count INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,
  prize TEXT,
  prize_value NUMERIC(12,2) DEFAULT 0,
  is_winner BOOLEAN DEFAULT false,
  duration_seconds INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. OVERLAY CONFIGS (configuracoes de overlay por empresa)
CREATE TABLE IF NOT EXISTS public.overlay_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT DEFAULT 'Default Overlay',
  layout TEXT DEFAULT 'leaderboard' CHECK (layout IN ('leaderboard', 'scoreboard', 'minimal', 'fullscreen', 'split')),
  show_timer BOOLEAN DEFAULT true,
  show_score BOOLEAN DEFAULT true,
  show_player_count BOOLEAN DEFAULT true,
  show_branding BOOLEAN DEFAULT true,
  show_confetti BOOLEAN DEFAULT true,
  show_sound_effects BOOLEAN DEFAULT false,
  animation_intensity TEXT DEFAULT 'high' CHECK (animation_intensity IN ('low', 'medium', 'high', 'extreme')),
  position TEXT DEFAULT 'bottom-right' CHECK (position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right', 'center', 'fullscreen')),
  opacity NUMERIC(3,2) DEFAULT 0.95,
  border_radius INTEGER DEFAULT 16,
  custom_css TEXT,
  is_default BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 4. ANALYTICS SNAPSHOTS (agregacao diaria para relatorios)
CREATE TABLE IF NOT EXISTS public.analytics_snapshots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  business_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  total_sessions INTEGER DEFAULT 0,
  total_players INTEGER DEFAULT 0,
  total_winners INTEGER DEFAULT 0,
  total_prize_value NUMERIC(12,2) DEFAULT 0,
  avg_session_duration INTEGER DEFAULT 0,
  top_game_type TEXT,
  top_game_name TEXT,
  unique_players INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(business_user_id, date)
);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_company_branding_user ON public.company_branding(user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_business ON public.game_sessions(business_user_id);
CREATE INDEX IF NOT EXISTS idx_game_sessions_live_code ON public.game_sessions(live_code);
CREATE INDEX IF NOT EXISTS idx_game_sessions_game_type ON public.game_sessions(game_type);
CREATE INDEX IF NOT EXISTS idx_game_sessions_created ON public.game_sessions(created_at);
CREATE INDEX IF NOT EXISTS idx_overlay_configs_user ON public.overlay_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_user ON public.analytics_snapshots(business_user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_snapshots_date ON public.analytics_snapshots(date);

-- RLS POLICIES
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.overlay_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.analytics_snapshots ENABLE ROW LEVEL SECURITY;

-- company_branding RLS (DROP + CREATE for idempotency)
DO $$ BEGIN
  DROP POLICY IF EXISTS "branding_select_own" ON public.company_branding;
  DROP POLICY IF EXISTS "branding_select_public" ON public.company_branding;
  DROP POLICY IF EXISTS "branding_insert_own" ON public.company_branding;
  DROP POLICY IF EXISTS "branding_update_own" ON public.company_branding;
  DROP POLICY IF EXISTS "branding_delete_own" ON public.company_branding;
  CREATE POLICY "branding_select_own" ON public.company_branding FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "branding_select_public" ON public.company_branding FOR SELECT USING (true);
  CREATE POLICY "branding_insert_own" ON public.company_branding FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "branding_update_own" ON public.company_branding FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "branding_delete_own" ON public.company_branding FOR DELETE USING (user_id = auth.uid());
 EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- game_sessions RLS
DO $$ BEGIN
  DROP POLICY IF EXISTS "sessions_select_own" ON public.game_sessions;
  DROP POLICY IF EXISTS "sessions_select_public" ON public.game_sessions;
  DROP POLICY IF EXISTS "sessions_insert" ON public.game_sessions;
  DROP POLICY IF EXISTS "sessions_update_own" ON public.game_sessions;
  CREATE POLICY "sessions_select_own" ON public.game_sessions FOR SELECT USING (business_user_id = auth.uid());
  CREATE POLICY "sessions_select_public" ON public.game_sessions FOR SELECT USING (true);
  CREATE POLICY "sessions_insert" ON public.game_sessions FOR INSERT WITH CHECK (business_user_id = auth.uid() OR business_user_id IS NULL);
  CREATE POLICY "sessions_update_own" ON public.game_sessions FOR UPDATE USING (business_user_id = auth.uid());
 EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- overlay_configs RLS
DO $$ BEGIN
  DROP POLICY IF EXISTS "overlay_select_own" ON public.overlay_configs;
  DROP POLICY IF EXISTS "overlay_insert_own" ON public.overlay_configs;
  DROP POLICY IF EXISTS "overlay_update_own" ON public.overlay_configs;
  DROP POLICY IF EXISTS "overlay_delete_own" ON public.overlay_configs;
  CREATE POLICY "overlay_select_own" ON public.overlay_configs FOR SELECT USING (user_id = auth.uid());
  CREATE POLICY "overlay_insert_own" ON public.overlay_configs FOR INSERT WITH CHECK (user_id = auth.uid());
  CREATE POLICY "overlay_update_own" ON public.overlay_configs FOR UPDATE USING (user_id = auth.uid());
  CREATE POLICY "overlay_delete_own" ON public.overlay_configs FOR DELETE USING (user_id = auth.uid());
 EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- analytics_snapshots RLS
DO $$ BEGIN
  DROP POLICY IF EXISTS "analytics_select_own" ON public.analytics_snapshots;
  DROP POLICY IF EXISTS "analytics_insert" ON public.analytics_snapshots;
  DROP POLICY IF EXISTS "analytics_update_own" ON public.analytics_snapshots;
  CREATE POLICY "analytics_select_own" ON public.analytics_snapshots FOR SELECT USING (business_user_id = auth.uid());
  CREATE POLICY "analytics_insert" ON public.analytics_snapshots FOR INSERT WITH CHECK (business_user_id = auth.uid());
  CREATE POLICY "analytics_update_own" ON public.analytics_snapshots FOR UPDATE USING (business_user_id = auth.uid());
 EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- FUNCTION: Auto-update updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS branding_updated_at ON public.company_branding;
CREATE TRIGGER branding_updated_at BEFORE UPDATE ON public.company_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS overlay_updated_at ON public.overlay_configs;
CREATE TRIGGER overlay_updated_at BEFORE UPDATE ON public.overlay_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- FUNCTION: Aggregate analytics snapshot
CREATE OR REPLACE FUNCTION public.refresh_daily_analytics(p_user_id UUID, p_date DATE DEFAULT CURRENT_DATE)
RETURNS void AS $$
DECLARE
  v_sessions INTEGER;
  v_players INTEGER;
  v_winners INTEGER;
  v_prize NUMERIC;
  v_avg_dur INTEGER;
  v_top_type TEXT;
  v_top_name TEXT;
  v_unique INTEGER;
BEGIN
  SELECT 
    COUNT(*),
    COALESCE(SUM(player_count), 0),
    COUNT(*) FILTER (WHERE is_winner = true),
    COALESCE(SUM(prize_value), 0),
    CASE WHEN COUNT(*) > 0 THEN COALESCE(AVG(duration_seconds), 0)::INTEGER ELSE 0 END
  INTO v_sessions, v_players, v_winners, v_prize, v_avg_dur
  FROM public.game_sessions
  WHERE business_user_id = p_user_id
    AND created_at >= p_date
    AND created_at < p_date + 1;

  SELECT COUNT(DISTINCT player_name)
  INTO v_unique
  FROM public.game_sessions
  WHERE business_user_id = p_user_id
    AND created_at >= p_date
    AND created_at < p_date + 1
    AND player_name IS NOT NULL;

  SELECT game_type, game_name
  INTO v_top_type, v_top_name
  FROM public.game_sessions
  WHERE business_user_id = p_user_id
    AND created_at >= p_date
    AND created_at < p_date + 1
  GROUP BY game_type, game_name
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  INSERT INTO public.analytics_snapshots (business_user_id, date, total_sessions, total_players, total_winners, total_prize_value, avg_session_duration, top_game_type, top_game_name, unique_players)
  VALUES (p_user_id, p_date, v_sessions, v_players, v_winners, v_prize, v_avg_dur, v_top_type, v_top_name, v_unique)
  ON CONFLICT (business_user_id, date) DO UPDATE SET
    total_sessions = EXCLUDED.total_sessions,
    total_players = EXCLUDED.total_players,
    total_winners = EXCLUDED.total_winners,
    total_prize_value = EXCLUDED.total_prize_value,
    avg_session_duration = EXCLUDED.avg_session_duration,
    top_game_type = EXCLUDED.top_game_type,
    top_game_name = EXCLUDED.top_game_name,
    unique_players = EXCLUDED.unique_players;
END;
$$ LANGUAGE plpgsql;
