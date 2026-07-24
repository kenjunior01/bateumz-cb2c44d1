
-- ========= SPIN WHEEL GAMES =========
ALTER TABLE public.spin_wheel_games
  ADD COLUMN IF NOT EXISTS background_image_url text,
  ADD COLUMN IF NOT EXISTS background_color text,
  ADD COLUMN IF NOT EXISTS sound_enabled boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS particle_effects boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS default_effect text DEFAULT 'confetti',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ========= SPIN WHEEL SEGMENTS =========
ALTER TABLE public.spin_wheel_segments
  ADD COLUMN IF NOT EXISTS text_color text DEFAULT '#ffffff',
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS reward_image_url text,
  ADD COLUMN IF NOT EXISTS max_wins_per_day integer,
  ADD COLUMN IF NOT EXISTS max_wins_total integer,
  ADD COLUMN IF NOT EXISTS current_wins_today integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_wins_total integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS effect_type text;

-- ========= MILLIONAIRE GAMES =========
ALTER TABLE public.millionaire_games
  ADD COLUMN IF NOT EXISTS background_color text DEFAULT '#0a0e17',
  ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS business_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- ========= MILLIONAIRE QUESTIONS =========
ALTER TABLE public.millionaire_questions
  ADD COLUMN IF NOT EXISTS difficulty text DEFAULT 'medium',
  ADD COLUMN IF NOT EXISTS points integer DEFAULT 100;

-- ========= SPIN WHEEL SESSIONS =========
CREATE TABLE IF NOT EXISTS public.spin_wheel_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wheel_id uuid REFERENCES public.spin_wheel_games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  segment_id uuid REFERENCES public.spin_wheel_segments(id) ON DELETE SET NULL,
  reward_type text,
  reward_value text,
  status text DEFAULT 'completed',
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT ON public.spin_wheel_sessions TO authenticated;
GRANT ALL ON public.spin_wheel_sessions TO service_role;
ALTER TABLE public.spin_wheel_sessions ENABLE ROW LEVEL SECURITY;

-- ========= MILLIONAIRE SESSIONS =========
CREATE TABLE IF NOT EXISTS public.millionaire_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid REFERENCES public.millionaire_games(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE SET NULL,
  current_level integer DEFAULT 1,
  prize_won numeric DEFAULT 0,
  status text DEFAULT 'in_progress',
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.millionaire_sessions TO authenticated;
GRANT ALL ON public.millionaire_sessions TO service_role;
ALTER TABLE public.millionaire_sessions ENABLE ROW LEVEL SECURITY;

-- ========= GRANTS on existing tables =========
GRANT SELECT, INSERT, UPDATE, DELETE ON public.spin_wheel_games TO authenticated;
GRANT ALL ON public.spin_wheel_games TO service_role;
GRANT SELECT ON public.spin_wheel_games TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.spin_wheel_segments TO authenticated;
GRANT ALL ON public.spin_wheel_segments TO service_role;
GRANT SELECT ON public.spin_wheel_segments TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.millionaire_games TO authenticated;
GRANT ALL ON public.millionaire_games TO service_role;
GRANT SELECT ON public.millionaire_games TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.millionaire_questions TO authenticated;
GRANT ALL ON public.millionaire_questions TO service_role;
GRANT SELECT ON public.millionaire_questions TO anon;

-- ========= POLICIES: SPIN WHEEL GAMES =========
DROP POLICY IF EXISTS "Public read wheel" ON public.spin_wheel_games;
DROP POLICY IF EXISTS "Public read active wheel" ON public.spin_wheel_games;
DROP POLICY IF EXISTS "Owner manage wheel" ON public.spin_wheel_games;
DROP POLICY IF EXISTS "Admin manage wheel" ON public.spin_wheel_games;

CREATE POLICY "Public read active wheel"
  ON public.spin_wheel_games FOR SELECT
  USING (is_published = true AND COALESCE(is_active, true) = true);

CREATE POLICY "Owner manage wheel"
  ON public.spin_wheel_games FOR ALL
  TO authenticated
  USING (business_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (business_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Admin manage wheel"
  ON public.spin_wheel_games FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- ========= POLICIES: SPIN WHEEL SEGMENTS =========
DROP POLICY IF EXISTS "Public read segments" ON public.spin_wheel_segments;
DROP POLICY IF EXISTS "Owner manage segments" ON public.spin_wheel_segments;
DROP POLICY IF EXISTS "Admin manage segments" ON public.spin_wheel_segments;

CREATE POLICY "Public read segments"
  ON public.spin_wheel_segments FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.spin_wheel_games g
    WHERE g.id = wheel_id AND g.is_published = true AND COALESCE(g.is_active, true) = true
  ));

CREATE POLICY "Owner manage segments"
  ON public.spin_wheel_segments FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.spin_wheel_games g
    WHERE g.id = wheel_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.spin_wheel_games g
    WHERE g.id = wheel_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ));

CREATE POLICY "Admin manage segments"
  ON public.spin_wheel_segments FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- ========= POLICIES: MILLIONAIRE GAMES =========
DROP POLICY IF EXISTS "Public read games" ON public.millionaire_games;
DROP POLICY IF EXISTS "Owner manage millionaire" ON public.millionaire_games;
DROP POLICY IF EXISTS "Admin manage millionaire" ON public.millionaire_games;

CREATE POLICY "Public read active millionaire"
  ON public.millionaire_games FOR SELECT
  USING (is_published = true AND COALESCE(is_active, true) = true);

CREATE POLICY "Owner manage millionaire"
  ON public.millionaire_games FOR ALL
  TO authenticated
  USING (business_user_id = auth.uid() OR created_by = auth.uid())
  WITH CHECK (business_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY "Admin manage millionaire"
  ON public.millionaire_games FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- ========= POLICIES: MILLIONAIRE QUESTIONS =========
DROP POLICY IF EXISTS "Public read questions" ON public.millionaire_questions;
DROP POLICY IF EXISTS "Owner manage questions" ON public.millionaire_questions;
DROP POLICY IF EXISTS "Admin manage questions" ON public.millionaire_questions;

CREATE POLICY "Public read questions"
  ON public.millionaire_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.millionaire_games g
    WHERE g.id = game_id AND g.is_published = true AND COALESCE(g.is_active, true) = true
  ));

CREATE POLICY "Owner manage questions"
  ON public.millionaire_questions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.millionaire_games g
    WHERE g.id = game_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.millionaire_games g
    WHERE g.id = game_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ));

CREATE POLICY "Admin manage questions"
  ON public.millionaire_questions FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- ========= POLICIES: SESSIONS =========
CREATE POLICY "User read own spin sessions"
  ON public.spin_wheel_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.spin_wheel_games g
    WHERE g.id = wheel_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

CREATE POLICY "User insert own spin sessions"
  ON public.spin_wheel_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User read own millionaire sessions"
  ON public.millionaire_sessions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.millionaire_games g
    WHERE g.id = game_id AND (g.business_user_id = auth.uid() OR g.created_by = auth.uid())
  ) OR public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

CREATE POLICY "User insert own millionaire sessions"
  ON public.millionaire_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "User update own millionaire sessions"
  ON public.millionaire_sessions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Backfill business_user_id from created_by so existing games are editable by their creator
UPDATE public.spin_wheel_games SET business_user_id = created_by WHERE business_user_id IS NULL AND created_by IS NOT NULL;
UPDATE public.millionaire_games SET business_user_id = created_by WHERE business_user_id IS NULL AND created_by IS NOT NULL;
