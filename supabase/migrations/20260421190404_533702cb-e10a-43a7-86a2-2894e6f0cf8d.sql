-- Enable realtime for contest_votes to power live leaderboard
ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_votes;
