
-- Football API Integration Tables
-- This migration adds support for real-time football data from football-data.org

-- 1. Football API Cache (for storing raw API responses)
CREATE TABLE IF NOT EXISTS public.football_api_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  competition text NOT NULL,
  raw_data jsonb NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.football_api_cache ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view cached data" ON public.football_api_cache FOR SELECT USING (true);
CREATE POLICY "Service role can manage cache" ON public.football_api_cache FOR ALL TO service_role USING (true);

-- 2. Real-Time Player Stats
CREATE TABLE IF NOT EXISTS public.fantasy_player_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fantasy_team_player_id uuid REFERENCES public.fantasy_team_players(id) ON DELETE CASCADE,
  world_cup_team_id uuid REFERENCES public.world_cup_teams(id),
  player_name text NOT NULL,
  player_position text NOT NULL,
  goals integer DEFAULT 0,
  assists integer DEFAULT 0,
  yellow_cards integer DEFAULT 0,
  red_cards integer DEFAULT 0,
  minutes_played integer DEFAULT 0,
  clean_sheets integer DEFAULT 0,
  saves integer DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.fantasy_player_stats ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view player stats" ON public.fantasy_player_stats FOR SELECT USING (true);
CREATE POLICY "Service role can manage stats" ON public.fantasy_player_stats FOR ALL TO service_role USING (true);

-- 3. Indexes for performance
CREATE INDEX idx_football_api_cache_competition ON public.football_api_cache(competition);
CREATE INDEX idx_football_api_cache_fetched_at ON public.football_api_cache(fetched_at);
CREATE INDEX idx_fantasy_player_stats_team ON public.fantasy_player_stats(world_cup_team_id);
CREATE INDEX idx_fantasy_player_stats_fantasy_player ON public.fantasy_player_stats(fantasy_team_player_id);

-- Trigger for updated_at
CREATE TRIGGER update_fantasy_player_stats_updated_at BEFORE UPDATE ON public.fantasy_player_stats 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT SELECT ON public.football_api_cache TO anon;
GRANT SELECT ON public.fantasy_player_stats TO anon;
GRANT ALL ON public.football_api_cache TO authenticated;
GRANT ALL ON public.fantasy_player_stats TO authenticated;
