CREATE TABLE IF NOT EXISTS public.millionaire_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  game_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  highest_level integer NOT NULL DEFAULT 0,
  highest_prize numeric NOT NULL DEFAULT 0,
  total_plays integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (game_id, user_id)
);
GRANT SELECT ON public.millionaire_leaderboard TO anon;
GRANT SELECT, INSERT, UPDATE ON public.millionaire_leaderboard TO authenticated;
GRANT ALL ON public.millionaire_leaderboard TO service_role;
ALTER TABLE public.millionaire_leaderboard ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leaderboard is public" ON public.millionaire_leaderboard FOR SELECT USING (true);
CREATE POLICY "Users insert own leaderboard row" ON public.millionaire_leaderboard FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own leaderboard row" ON public.millionaire_leaderboard FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
DROP TRIGGER IF EXISTS trg_millionaire_leaderboard_updated ON public.millionaire_leaderboard;
CREATE TRIGGER trg_millionaire_leaderboard_updated BEFORE UPDATE ON public.millionaire_leaderboard FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();