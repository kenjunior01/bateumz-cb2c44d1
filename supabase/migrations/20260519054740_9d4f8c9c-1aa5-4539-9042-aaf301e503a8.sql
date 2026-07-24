-- Newsletter signups for landing page "Stay in the loop" feature
CREATE TABLE IF NOT EXISTS public.newsletter_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  source text NOT NULL DEFAULT 'landing',
  country text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email)
);

ALTER TABLE public.newsletter_signups ENABLE ROW LEVEL SECURITY;

-- Anyone (logged in or not) can subscribe
CREATE POLICY "Anyone can subscribe"
  ON public.newsletter_signups FOR INSERT
  WITH CHECK (true);

-- Only admins can view the list
CREATE POLICY "Admins can read signups"
  ON public.newsletter_signups FOR SELECT
  USING (public.has_role(auth.uid(), 'admin'));

-- Track first paid purchase per user (for referral bonus eligibility)
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS first_purchase_bonus_at timestamptz,
  ADD COLUMN IF NOT EXISTS first_purchase_bonus_points integer NOT NULL DEFAULT 0;