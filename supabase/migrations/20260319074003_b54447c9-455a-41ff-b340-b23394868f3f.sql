
-- Add category column to raffles
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS category text DEFAULT 'outros';

-- Create blockchain_verifications table for storing draw verification hashes
CREATE TABLE IF NOT EXISTS public.blockchain_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  raffle_id uuid REFERENCES public.raffles(id) ON DELETE CASCADE NOT NULL,
  tx_hash text NOT NULL,
  block_number bigint NOT NULL,
  network text NOT NULL DEFAULT 'polygon',
  winner_ticket_number integer,
  seed_data jsonb,
  verified_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(raffle_id)
);

ALTER TABLE public.blockchain_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view verifications" ON public.blockchain_verifications
  FOR SELECT TO public USING (true);

CREATE POLICY "System can insert verifications" ON public.blockchain_verifications
  FOR INSERT TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM public.raffles WHERE id = raffle_id AND business_user_id = auth.uid())
    OR has_role(auth.uid(), 'admin')
  );
