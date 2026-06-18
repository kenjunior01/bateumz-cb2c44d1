CREATE TABLE IF NOT EXISTS public.worldcup_rss_feeds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  fetched_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.worldcup_rss_feeds ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view RSS feeds" ON public.worldcup_rss_feeds FOR SELECT USING (true);
CREATE POLICY "Service role can manage RSS feeds" ON public.worldcup_rss_feeds FOR ALL TO service_role USING (true);

GRANT SELECT ON public.worldcup_rss_feeds TO anon;
GRANT ALL ON public.worldcup_rss_feeds TO authenticated;
GRANT ALL ON public.worldcup_rss_feeds TO service_role;
