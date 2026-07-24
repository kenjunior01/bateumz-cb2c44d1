ALTER TABLE public.contests 
  ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS submission_fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS requires_video BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS requires_photo BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS min_age INTEGER,
  ADD COLUMN IF NOT EXISTS hashtag TEXT;

CREATE INDEX IF NOT EXISTS idx_contests_category ON public.contests(category);
CREATE INDEX IF NOT EXISTS idx_contests_status ON public.contests(status);

ALTER TABLE public.contest_submissions
  ADD COLUMN IF NOT EXISTS extra_fields JSONB NOT NULL DEFAULT '{}'::jsonb;