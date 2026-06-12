-- ============================================================================
-- MILLIONAIRE GAME (Quem Quer Ser Milionário)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.millionaire_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Visual Customization
  background_image_url TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  primary_color TEXT DEFAULT '#FFD700',
  secondary_color TEXT DEFAULT '#FFFFFF',
  accent_color TEXT DEFAULT '#FF6B6B',
  
  -- Game Configuration
  total_questions INTEGER DEFAULT 15,
  time_per_question INTEGER DEFAULT 30, -- seconds
  difficulty_level TEXT DEFAULT 'mixed', -- easy, medium, hard, mixed
  
  -- Prize Pyramid
  prize_structure JSONB DEFAULT '[
    {"level": 1, "amount": 100, "currency": "USD"},
    {"level": 2, "amount": 500, "currency": "USD"},
    {"level": 3, "amount": 1000, "currency": "USD"},
    {"level": 4, "amount": 5000, "currency": "USD"},
    {"level": 5, "amount": 10000, "currency": "USD"},
    {"level": 6, "amount": 25000, "currency": "USD"},
    {"level": 7, "amount": 50000, "currency": "USD"},
    {"level": 8, "amount": 100000, "currency": "USD"},
    {"level": 9, "amount": 250000, "currency": "USD"},
    {"level": 10, "amount": 500000, "currency": "USD"},
    {"level": 11, "amount": 1000000, "currency": "USD"},
    {"level": 12, "amount": 2500000, "currency": "USD"},
    {"level": 13, "amount": 5000000, "currency": "USD"},
    {"level": 14, "amount": 10000000, "currency": "USD"},
    {"level": 15, "amount": 50000000, "currency": "USD"}
  ]'::jsonb,
  
  -- Lifelines Configuration
  lifelines JSONB DEFAULT '{
    "50_50": true,
    "phone_a_friend": true,
    "ask_audience": true,
    "double_dip": false
  }'::jsonb,
  
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.millionaire_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.millionaire_games(id) ON DELETE CASCADE,
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  
  -- Options
  option_a TEXT NOT NULL,
  option_b TEXT NOT NULL,
  option_c TEXT NOT NULL,
  option_d TEXT NOT NULL,
  correct_answer TEXT NOT NULL, -- A, B, C, D
  
  -- Difficulty
  difficulty TEXT DEFAULT 'medium', -- easy, medium, hard
  
  -- Explanation
  explanation TEXT,
  explanation_image_url TEXT,
  
  -- Analytics
  attempts INTEGER DEFAULT 0,
  correct_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  CONSTRAINT valid_answer CHECK (correct_answer IN ('A', 'B', 'C', 'D')),
  UNIQUE(game_id, question_number)
);

CREATE TABLE IF NOT EXISTS public.millionaire_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.millionaire_games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  
  current_level INTEGER DEFAULT 1,
  prize_won DECIMAL(15, 2) DEFAULT 0,
  status TEXT DEFAULT 'in_progress', -- in_progress, completed, abandoned
  
  -- Lifelines Used
  lifelines_used JSONB DEFAULT '{"50_50": false, "phone_a_friend": false, "ask_audience": false, "double_dip": false}'::jsonb,
  
  -- Answers
  answers JSONB DEFAULT '{}'::jsonb, -- {"question_1": "A", "question_2": "B"}
  
  started_at TIMESTAMP DEFAULT now(),
  ended_at TIMESTAMP,
  duration_seconds INTEGER,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.millionaire_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID NOT NULL REFERENCES public.millionaire_games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  
  highest_level INTEGER DEFAULT 0,
  highest_prize DECIMAL(15, 2) DEFAULT 0,
  total_plays INTEGER DEFAULT 0,
  total_wins INTEGER DEFAULT 0,
  average_level DECIMAL(5, 2) DEFAULT 0,
  
  last_played_at TIMESTAMP,
  
  UNIQUE(game_id, user_id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- SPIN WHEEL GAME (Roda da Sorte)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.spin_wheel_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.profiles(user_id),
  name TEXT NOT NULL,
  description TEXT,
  
  -- Visual Customization
  background_image_url TEXT,
  background_color TEXT DEFAULT '#1a1a1a',
  wheel_background_color TEXT DEFAULT '#2d2d2d',
  wheel_border_color TEXT DEFAULT '#FFD700',
  
  -- Wheel Configuration
  segment_count INTEGER DEFAULT 8,
  rotation_duration INTEGER DEFAULT 5, -- seconds
  spin_cost DECIMAL(10, 2) DEFAULT 0, -- 0 = free
  
  -- Animation
  animation_style TEXT DEFAULT 'smooth', -- smooth, bouncy, elastic
  sound_enabled BOOLEAN DEFAULT true,
  particle_effects BOOLEAN DEFAULT true,
  
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spin_wheel_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID NOT NULL REFERENCES public.spin_wheel_games(id) ON DELETE CASCADE,
  segment_number INTEGER NOT NULL,
  
  -- Segment Content
  label TEXT NOT NULL,
  description TEXT,
  icon_url TEXT,
  
  -- Visual
  background_color TEXT NOT NULL,
  text_color TEXT DEFAULT '#FFFFFF',
  
  -- Prize/Reward
  reward_type TEXT DEFAULT 'points', -- points, discount, prize, entry, badge
  reward_value TEXT NOT NULL, -- "100", "50%", "Free Entry", etc
  reward_image_url TEXT,
  
  -- Probability
  weight INTEGER DEFAULT 1, -- Higher = more likely
  probability_percentage DECIMAL(5, 2),
  
  -- Limits
  max_wins_per_day INTEGER,
  max_wins_total INTEGER,
  current_wins_today INTEGER DEFAULT 0,
  current_wins_total INTEGER DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  
  UNIQUE(wheel_id, segment_number)
);

CREATE TABLE IF NOT EXISTS public.spin_wheel_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID NOT NULL REFERENCES public.spin_wheel_games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  
  -- Spin Details
  segment_id UUID NOT NULL REFERENCES public.spin_wheel_segments(id),
  reward_type TEXT NOT NULL,
  reward_value TEXT NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'completed', -- pending, completed, claimed, expired
  claimed_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Metadata
  spin_angle DECIMAL(10, 2),
  rotation_duration INTEGER,
  
  created_at TIMESTAMP DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.spin_wheel_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id UUID NOT NULL REFERENCES public.spin_wheel_games(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  region_id UUID NOT NULL REFERENCES public.regions(id),
  
  total_spins INTEGER DEFAULT 0,
  total_rewards_won DECIMAL(15, 2) DEFAULT 0,
  favorite_segment_id UUID REFERENCES public.spin_wheel_segments(id),
  
  last_spin_at TIMESTAMP,
  
  UNIQUE(wheel_id, user_id),
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX idx_millionaire_games_region ON public.millionaire_games(region_id);
CREATE INDEX idx_millionaire_games_company ON public.millionaire_games(company_id);
CREATE INDEX idx_millionaire_questions_game ON public.millionaire_questions(game_id);
CREATE INDEX idx_millionaire_sessions_game ON public.millionaire_sessions(game_id);
CREATE INDEX idx_millionaire_sessions_user ON public.millionaire_sessions(user_id);
CREATE INDEX idx_millionaire_leaderboard_game ON public.millionaire_leaderboard(game_id);

CREATE INDEX idx_spin_wheel_games_region ON public.spin_wheel_games(region_id);
CREATE INDEX idx_spin_wheel_games_company ON public.spin_wheel_games(company_id);
CREATE INDEX idx_spin_wheel_segments_wheel ON public.spin_wheel_segments(wheel_id);
CREATE INDEX idx_spin_wheel_sessions_wheel ON public.spin_wheel_sessions(wheel_id);
CREATE INDEX idx_spin_wheel_sessions_user ON public.spin_wheel_sessions(user_id);
CREATE INDEX idx_spin_wheel_leaderboard_wheel ON public.spin_wheel_leaderboard(wheel_id);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- Millionaire Games RLS
ALTER TABLE public.millionaire_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published millionaire games"
  ON public.millionaire_games FOR SELECT
  USING (is_published = true OR auth.uid() = created_by OR public.is_superadmin(auth.uid()));

CREATE POLICY "Creators can manage their millionaire games"
  ON public.millionaire_games FOR ALL
  USING (auth.uid() = created_by OR public.is_superadmin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_superadmin(auth.uid()));

-- Millionaire Questions RLS
ALTER TABLE public.millionaire_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read questions from published games"
  ON public.millionaire_questions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.millionaire_games
      WHERE id = game_id AND (is_published = true OR auth.uid() = created_by)
    )
  );

CREATE POLICY "Game creators can manage questions"
  ON public.millionaire_questions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.millionaire_games
      WHERE id = game_id AND auth.uid() = created_by
    )
  );

-- Millionaire Sessions RLS
ALTER TABLE public.millionaire_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own sessions"
  ON public.millionaire_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE POLICY "Users can create sessions"
  ON public.millionaire_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Spin Wheel Games RLS
ALTER TABLE public.spin_wheel_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read published spin wheel games"
  ON public.spin_wheel_games FOR SELECT
  USING (is_published = true OR auth.uid() = created_by OR public.is_superadmin(auth.uid()));

CREATE POLICY "Creators can manage their spin wheel games"
  ON public.spin_wheel_games FOR ALL
  USING (auth.uid() = created_by OR public.is_superadmin(auth.uid()))
  WITH CHECK (auth.uid() = created_by OR public.is_superadmin(auth.uid()));

-- Spin Wheel Segments RLS
ALTER TABLE public.spin_wheel_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read segments from published wheels"
  ON public.spin_wheel_segments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.spin_wheel_games
      WHERE id = wheel_id AND (is_published = true OR auth.uid() = created_by)
    )
  );

CREATE POLICY "Wheel creators can manage segments"
  ON public.spin_wheel_segments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.spin_wheel_games
      WHERE id = wheel_id AND auth.uid() = created_by
    )
  );

-- Spin Wheel Sessions RLS
ALTER TABLE public.spin_wheel_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see their own spin sessions"
  ON public.spin_wheel_sessions FOR SELECT
  USING (auth.uid() = user_id OR public.is_superadmin(auth.uid()));

CREATE POLICY "Users can create spin sessions"
  ON public.spin_wheel_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);
