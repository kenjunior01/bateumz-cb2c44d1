-- ============================================
-- Company Games Management System
-- Allows each company to manage ALL their games from one panel
-- Adds millionaire_leaderboard table (was referenced but missing)
-- Adds company_game_configs for per-company game settings
-- ============================================

-- Company game configurations (enable/disable/tune games per company)
CREATE TABLE IF NOT EXISTS public.company_game_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  game_id TEXT NOT NULL,
  game_label TEXT NOT NULL DEFAULT '',
  is_enabled BOOLEAN NOT NULL DEFAULT true,
  is_published BOOLEAN NOT NULL DEFAULT false,
  settings JSONB NOT NULL DEFAULT '{}',
  play_count INT NOT NULL DEFAULT 0,
  total_prizes_awarded DECIMAL(15,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, game_id)
);

ALTER TABLE public.company_game_configs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Companies manage own game configs" ON public.company_game_configs
  FOR ALL USING (company_id = auth.uid());
CREATE POLICY "Public read published configs" ON public.company_game_configs
  FOR SELECT USING (is_published = true);

CREATE INDEX idx_cgc_company ON public.company_game_configs(company_id);
CREATE INDEX idx_cgc_published ON public.company_game_configs(is_published) WHERE is_published = true;

-- Millionaire leaderboard (was referenced in code but missing from DB)
CREATE TABLE IF NOT EXISTS public.millionaire_leaderboard (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id UUID REFERENCES public.millionaire_games(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL,
  highest_level INT NOT NULL DEFAULT 0,
  highest_prize DECIMAL(15,2) NOT NULL DEFAULT 0,
  total_plays INT NOT NULL DEFAULT 0,
  total_wins INT NOT NULL DEFAULT 0,
  average_level DECIMAL(5,2) NOT NULL DEFAULT 0,
  last_played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(game_id, user_id)
);

ALTER TABLE public.millionaire_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read leaderboard" ON public.millionaire_leaderboard
  FOR SELECT USING (true);
CREATE POLICY "Users insert own entries" ON public.millionaire_leaderboard
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users update own entries" ON public.millionaire_leaderboard
  FOR UPDATE USING (user_id = auth.uid());

-- Auto-update timestamp trigger
CREATE OR REPLACE FUNCTION public.cgc_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cgc_updated_at_trg
  BEFORE UPDATE ON public.company_game_configs
  FOR EACH ROW EXECUTE FUNCTION public.cgc_updated_at();

-- Upsert leaderboard entry after a session ends
CREATE OR REPLACE FUNCTION public.millionaire_upsert_leaderboard()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.millionaire_leaderboard (game_id, user_id, region_id, highest_level, highest_prize, total_plays, total_wins, average_level, last_played_at)
  VALUES (
    NEW.game_id,
    NEW.user_id,
    NEW.region_id,
    NEW.current_level,
    NEW.prize_won,
    1,
    CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    NEW.current_level::DECIMAL,
    now()
  )
  ON CONFLICT (game_id, user_id) DO UPDATE SET
    highest_level = GREATEST(millionaire_leaderboard.highest_level, NEW.current_level),
    highest_prize = GREATEST(millionaire_leaderboard.highest_prize, NEW.prize_won),
    total_plays = millionaire_leaderboard.total_plays + 1,
    total_wins = millionaire_leaderboard.total_wins + CASE WHEN NEW.status = 'completed' THEN 1 ELSE 0 END,
    average_level = ((millionaire_leaderboard.average_level * millionaire_leaderboard.total_plays) + NEW.current_level)::DECIMAL / (millionaire_leaderboard.total_plays + 1)::DECIMAL,
    last_played_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER millionaire_session_leaderboard_trg
  AFTER INSERT ON public.millionaire_sessions
  FOR EACH ROW EXECUTE FUNCTION public.millionaire_upsert_leaderboard();

-- Company games overview view
CREATE OR REPLACE VIEW public.company_games_overview AS
SELECT
  cgc.company_id,
  cgc.game_id,
  cgc.game_label,
  cgc.is_enabled,
  cgc.is_published,
  cgc.settings,
  cgc.play_count,
  cgc.total_prizes_awarded,
  p.display_name as company_name,
  cb.company_logo_url
FROM public.company_game_configs cgc
LEFT JOIN public.profiles p ON p.user_id = cgc.company_id
LEFT JOIN public.company_branding cb ON cb.user_id = cgc.company_id;

-- Grant access
GRANT SELECT ON public.company_games_overview TO authenticated, anon;
GRANT ALL ON public.company_game_configs TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.millionaire_leaderboard TO authenticated;
GRANT SELECT ON public.millionaire_leaderboard TO anon;
