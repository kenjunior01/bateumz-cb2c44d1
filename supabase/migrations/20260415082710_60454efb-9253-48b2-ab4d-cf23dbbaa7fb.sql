
-- Contests table
CREATE TABLE public.contests (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  prize_description TEXT,
  image_url TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  evaluation_type TEXT NOT NULL DEFAULT 'votes',
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  max_submissions_per_user INTEGER NOT NULL DEFAULT 1,
  created_by UUID NOT NULL,
  winner_submission_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published contests" ON public.contests
  FOR SELECT USING (status IN ('active', 'voting', 'completed') OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage contests" ON public.contests
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contests_updated_at
  BEFORE UPDATE ON public.contests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contest submissions table
CREATE TABLE public.contest_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  contest_id UUID NOT NULL REFERENCES public.contests(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  participant_name TEXT NOT NULL,
  description TEXT,
  photo_url TEXT,
  video_url TEXT,
  votes_count INTEGER NOT NULL DEFAULT 0,
  views_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  is_winner BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.contest_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved submissions" ON public.contest_submissions
  FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR has_role(auth.uid(), 'admin'));

CREATE POLICY "Auth users can submit" ON public.contest_submissions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pending submissions" ON public.contest_submissions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id AND status IN ('pending', 'approved'));

CREATE POLICY "Users can delete own pending submissions" ON public.contest_submissions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id AND status = 'pending');

CREATE POLICY "Admins can manage all submissions" ON public.contest_submissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_contest_submissions_updated_at
  BEFORE UPDATE ON public.contest_submissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Contest votes table
CREATE TABLE public.contest_votes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  submission_id UUID NOT NULL REFERENCES public.contest_submissions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(submission_id, user_id)
);

ALTER TABLE public.contest_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view votes" ON public.contest_votes
  FOR SELECT USING (true);

CREATE POLICY "Auth users can vote" ON public.contest_votes
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON public.contest_votes
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Storage bucket for contest media
INSERT INTO storage.buckets (id, name, public) VALUES ('contest-media', 'contest-media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view contest media" ON storage.objects
  FOR SELECT USING (bucket_id = 'contest-media');

CREATE POLICY "Auth users can upload contest media" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'contest-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update own contest media" ON storage.objects
  FOR UPDATE USING (bucket_id = 'contest-media' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own contest media" ON storage.objects
  FOR DELETE USING (bucket_id = 'contest-media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Function to increment vote count
CREATE OR REPLACE FUNCTION public.handle_contest_vote()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE contest_submissions SET votes_count = votes_count + 1 WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE contest_submissions SET votes_count = votes_count - 1 WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
END;
$$;

CREATE TRIGGER on_contest_vote
  AFTER INSERT OR DELETE ON public.contest_votes
  FOR EACH ROW EXECUTE FUNCTION public.handle_contest_vote();
