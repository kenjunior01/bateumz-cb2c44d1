
-- Add social raffle fields to raffles table
ALTER TABLE public.raffles
  ADD COLUMN IF NOT EXISTS social_actions jsonb DEFAULT '[]'::jsonb;

-- Create table for social raffle participations (tracking social actions)
CREATE TABLE IF NOT EXISTS public.social_participations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  social_username text,
  actions_completed jsonb DEFAULT '[]'::jsonb,
  verified boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(raffle_id, user_id)
);

ALTER TABLE public.social_participations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view social participations" ON public.social_participations
  FOR SELECT TO public USING (true);

CREATE POLICY "Auth users can insert social participations" ON public.social_participations
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins and business can update social participations" ON public.social_participations
  FOR UPDATE TO public USING (
    has_role(auth.uid(), 'admin'::app_role) OR
    EXISTS (SELECT 1 FROM raffles WHERE raffles.id = social_participations.raffle_id AND raffles.business_user_id = auth.uid())
  );
