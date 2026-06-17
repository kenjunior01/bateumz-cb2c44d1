
-- Update helper functions to support multi-region admins
CREATE OR REPLACE FUNCTION public.admin_countries(_user_id uuid)
RETURNS SETOF text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT country_code FROM public.admin_regions WHERE user_id = _user_id
$$;

CREATE OR REPLACE FUNCTION public.can_admin_country(_user_id uuid, _country text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_superadmin(_user_id)
    OR (
      public.has_role(_user_id, 'admin')
      AND EXISTS (
        SELECT 1 FROM public.admin_countries(_user_id)
        WHERE country_code = _country
      )
    )
$$;

-- Create regional subscription plans
CREATE TABLE IF NOT EXISTS public.regional_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL REFERENCES public.regions(country_code) ON UPDATE CASCADE,
  name text NOT NULL,
  description text,
  price numeric NOT NULL,
  currency text NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly', -- monthly, yearly
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  is_popular boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regional_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regional plans" ON public.regional_plans
  FOR SELECT USING (is_active = true);
CREATE POLICY "Regional admins manage their country plans" ON public.regional_plans
  FOR ALL TO authenticated
  USING (public.can_admin_country(auth.uid(), country_code))
  WITH CHECK (public.can_admin_country(auth.uid(), country_code));

CREATE TRIGGER trg_regional_plans_updated BEFORE UPDATE ON public.regional_plans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure RLS policies are updated for all tables using can_admin_country
-- First, reapply raffle policies
DROP POLICY IF EXISTS "Regional admins view raffles" ON public.raffles;
DROP POLICY IF EXISTS "Regional admins update raffles" ON public.raffles;
DROP POLICY IF EXISTS "Regional admins delete raffles" ON public.raffles;

CREATE POLICY "Regional admins view raffles" ON public.raffles
  FOR SELECT USING (public.can_admin_country(auth.uid(), country));
CREATE POLICY "Regional admins update raffles" ON public.raffles
  FOR UPDATE USING (public.can_admin_country(auth.uid(), country));
CREATE POLICY "Regional admins delete raffles" ON public.raffles
  FOR DELETE USING (public.can_admin_country(auth.uid(), country));

-- Update participants
DROP POLICY IF EXISTS "Regional admins view participants" ON public.participants;
CREATE POLICY "Regional admins view participants" ON public.participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.raffles r WHERE r.id = participants.raffle_id AND public.can_admin_country(auth.uid(), r.country))
  );

-- Update contests
DROP POLICY IF EXISTS "Regional admins manage contests" ON public.contests;
CREATE POLICY "Regional admins manage contests" ON public.contests
  FOR ALL TO authenticated
  USING (public.can_admin_country(auth.uid(), COALESCE(country, 'US')))
  WITH CHECK (public.can_admin_country(auth.uid(), COALESCE(country, 'US')));

-- Revoke execute from anon
REVOKE EXECUTE ON FUNCTION public.admin_countries(uuid) FROM anon;
