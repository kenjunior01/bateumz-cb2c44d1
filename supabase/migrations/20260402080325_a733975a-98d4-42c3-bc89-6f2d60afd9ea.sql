
-- Table for social raffle proof submissions and approval workflow
CREATE TABLE IF NOT EXISTS public.social_raffle_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid NOT NULL REFERENCES public.raffles(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  social_username text,
  missions_completed jsonb NOT NULL DEFAULT '[]'::jsonb,
  proofs jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','under_review','approved','rejected')),
  rejection_reason text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (raffle_id, user_id)
);

ALTER TABLE public.social_raffle_entries ENABLE ROW LEVEL SECURITY;

-- Anyone can view entries for transparency
CREATE POLICY "Anyone can view social raffle entries"
  ON public.social_raffle_entries FOR SELECT
  TO public USING (true);

-- Authenticated users can create their own entries
CREATE POLICY "Users can insert own entries"
  ON public.social_raffle_entries FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending entries
CREATE POLICY "Users can update own pending entries"
  ON public.social_raffle_entries FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id AND status IN ('pending', 'rejected')
  );

-- Business owners can review entries for their raffles
CREATE POLICY "Business owners can review entries"
  ON public.social_raffle_entries FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM public.raffles WHERE id = social_raffle_entries.raffle_id AND business_user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );

-- Create proof-screenshots storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('social-proofs', 'social-proofs', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can view social proofs" ON storage.objects FOR SELECT TO public USING (bucket_id = 'social-proofs');
CREATE POLICY "Auth users can upload social proofs" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'social-proofs');

-- Add updated_at trigger
CREATE OR REPLACE TRIGGER update_social_raffle_entries_updated_at
  BEFORE UPDATE ON public.social_raffle_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
