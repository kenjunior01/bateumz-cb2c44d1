
-- Luck Points table
CREATE TABLE public.luck_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  points integer NOT NULL DEFAULT 0,
  action text NOT NULL,
  description text,
  raffle_id uuid REFERENCES public.raffles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.luck_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points"
ON public.luck_points FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can insert points"
ON public.luck_points FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Rewards table
CREATE TABLE public.rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  points_cost integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount',
  value numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active rewards"
ON public.rewards FOR SELECT
USING (is_active = true);

-- Redeemed rewards
CREATE TABLE public.redeemed_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.rewards(id) ON DELETE CASCADE NOT NULL,
  points_spent integer NOT NULL,
  status text NOT NULL DEFAULT 'active',
  redeemed_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.redeemed_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their redeemed rewards"
ON public.redeemed_rewards FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can redeem rewards"
ON public.redeemed_rewards FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Enable realtime for luck_points
ALTER PUBLICATION supabase_realtime ADD TABLE public.luck_points;
