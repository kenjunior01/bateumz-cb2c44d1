-- Company branding for live games (custom colors, logos, backgrounds)
CREATE TABLE IF NOT EXISTS public.company_branding (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT,
  company_slogan TEXT,
  company_logo_url TEXT,
  primary_color TEXT DEFAULT '#fbbf24',
  secondary_color TEXT DEFAULT '#3b82f6',
  accent_color TEXT DEFAULT '#8b5cf6',
  background_color TEXT DEFAULT '#0a0e17',
  text_color TEXT DEFAULT '#ffffff',
  background_image_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Live game configuration per user
CREATE TABLE IF NOT EXISTS public.live_game_configs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tap_duration INTEGER DEFAULT 5,
  quiz_questions INTEGER DEFAULT 5,
  quiz_time_per_q INTEGER DEFAULT 8,
  mystery_high REAL DEFAULT 0.25,
  mystery_low REAL DEFAULT 0.4,
  mystery_none REAL DEFAULT 0.35,
  board_game_timer INTEGER DEFAULT 30,
  allow_undo BOOLEAN DEFAULT false,
  scoring_system TEXT DEFAULT 'cumulative',
  point_multiplier REAL DEFAULT 1.0,
  allow_audience_challenges BOOLEAN DEFAULT true,
  challenge_cooldown INTEGER DEFAULT 30,
  enable_particles BOOLEAN DEFAULT true,
  enable_confetti BOOLEAN DEFAULT true,
  enable_glow_effects BOOLEAN DEFAULT true,
  animation_speed TEXT DEFAULT 'normal',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- Company game presets (save and reload custom game configurations)
CREATE TABLE IF NOT EXISTS public.company_game_presets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  game_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}',
  branding_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Live sessions persisted to database (for cross-device history)
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  live_code TEXT NOT NULL,
  title TEXT,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  duration_sec INTEGER DEFAULT 0,
  active_game TEXT,
  winners JSONB DEFAULT '[]'::jsonb,
  leaderboard JSONB DEFAULT '[]'::jsonb,
  total_players INTEGER DEFAULT 0,
  total_games INTEGER DEFAULT 0,
  total_score BIGINT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_branding_user_id ON public.company_branding(user_id);
CREATE INDEX IF NOT EXISTS idx_live_game_configs_user_id ON public.live_game_configs(user_id);
CREATE INDEX IF NOT EXISTS idx_company_game_presets_user_id ON public.company_game_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_user_id ON public.live_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_live_code ON public.live_sessions(live_code);

-- RLS policies
ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_game_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_game_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;

-- company_branding: owners can read/write their own, public read for company_name, logo, colors
CREATE POLICY "Branding owners full access" ON public.company_branding FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Branding public read" ON public.company_branding FOR SELECT USING (true);

-- live_game_configs: owners only
CREATE POLICY "GameConfig owners full access" ON public.live_game_configs FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- company_game_presets: owners full, public read
CREATE POLICY "Presets owners full access" ON public.company_game_presets FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Presets public read" ON public.company_game_presets FOR SELECT USING (is_active = true);

-- live_sessions: owners full, public read
CREATE POLICY "LiveSessions owners full access" ON public.live_sessions FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "LiveSessions public read" ON public.live_sessions FOR SELECT USING (true);
