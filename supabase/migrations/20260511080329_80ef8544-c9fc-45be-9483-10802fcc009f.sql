
CREATE TABLE public.user_stories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  content TEXT,
  image_url TEXT,
  background TEXT NOT NULL DEFAULT 'from-primary to-emerald-400',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (now() + interval '24 hours'),
  CONSTRAINT user_stories_content_or_image CHECK (
    (content IS NOT NULL AND length(trim(content)) > 0) OR image_url IS NOT NULL
  ),
  CONSTRAINT user_stories_content_max CHECK (content IS NULL OR length(content) <= 280)
);

CREATE INDEX idx_user_stories_expires ON public.user_stories (expires_at DESC);
CREATE INDEX idx_user_stories_user ON public.user_stories (user_id, created_at DESC);

ALTER TABLE public.user_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active stories"
ON public.user_stories FOR SELECT
USING (expires_at > now());

CREATE POLICY "Users can create own stories"
ON public.user_stories FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own stories"
ON public.user_stories FOR DELETE
TO authenticated
USING (auth.uid() = user_id OR has_role(auth.uid(), 'admin'::app_role));

INSERT INTO storage.buckets (id, name, public)
VALUES ('user-stories', 'user-stories', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view status images"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-stories');

CREATE POLICY "Users can upload own status images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'user-stories' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete own status images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'user-stories' AND auth.uid()::text = (storage.foldername(name))[1]);
