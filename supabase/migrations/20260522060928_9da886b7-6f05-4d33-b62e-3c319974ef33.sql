-- Regions catalog
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code text NOT NULL UNIQUE,
  label text NOT NULL,
  flag text,
  currency text NOT NULL DEFAULT 'USD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active regions" ON public.regions
  FOR SELECT USING (is_active = true OR has_role(auth.uid(), 'admin') OR has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Superadmins manage regions" ON public.regions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));

INSERT INTO public.regions (country_code, label, flag, currency) VALUES
  ('US','United States','🇺🇸','USD'),
  ('CA','Canada','🇨🇦','CAD'),
  ('PT','Portugal','🇵🇹','EUR'),
  ('BR','Brazil','🇧🇷','BRL'),
  ('MZ','Mozambique','🇲🇿','MZN'),
  ('AO','Angola','🇦🇴','AOA')
ON CONFLICT (country_code) DO NOTHING;

-- Admin -> Region
CREATE TABLE IF NOT EXISTS public.admin_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  country_code text NOT NULL REFERENCES public.regions(country_code) ON UPDATE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.admin_regions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage admin_regions" ON public.admin_regions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins can view own assignment" ON public.admin_regions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- Regional commissions
CREATE TABLE IF NOT EXISTS public.regional_commissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  country_code text NOT NULL REFERENCES public.regions(country_code) ON UPDATE CASCADE,
  commission_percentage numeric NOT NULL DEFAULT 10 CHECK (commission_percentage >= 0 AND commission_percentage <= 100),
  notes text,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regional_commissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Superadmins manage commissions" ON public.regional_commissions
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'superadmin'))
  WITH CHECK (has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admin can view own commission" ON public.regional_commissions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_admin_regions_updated BEFORE UPDATE ON public.admin_regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_regional_commissions_updated BEFORE UPDATE ON public.regional_commissions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_regions_updated BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpers
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
$$;

CREATE OR REPLACE FUNCTION public.admin_country(_user_id uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT country_code FROM public.admin_regions WHERE user_id = _user_id LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.can_admin_country(_user_id uuid, _country text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    public.is_superadmin(_user_id)
    OR (
      public.has_role(_user_id, 'admin')
      AND public.admin_country(_user_id) = _country
    )
$$;

REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_country(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_admin_country(uuid, text) FROM anon;

-- Region-scope existing admin policies
DROP POLICY IF EXISTS "Admins can view all raffles" ON public.raffles;
DROP POLICY IF EXISTS "Admins can update raffles" ON public.raffles;
DROP POLICY IF EXISTS "Admins can delete raffles" ON public.raffles;

CREATE POLICY "Regional admins view raffles" ON public.raffles
  FOR SELECT USING (public.can_admin_country(auth.uid(), country));
CREATE POLICY "Regional admins update raffles" ON public.raffles
  FOR UPDATE USING (public.can_admin_country(auth.uid(), country));
CREATE POLICY "Regional admins delete raffles" ON public.raffles
  FOR DELETE USING (public.can_admin_country(auth.uid(), country));

DROP POLICY IF EXISTS "Admins can view all participants" ON public.participants;
CREATE POLICY "Regional admins view participants" ON public.participants
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.raffles r WHERE r.id = participants.raffle_id AND public.can_admin_country(auth.uid(), r.country))
  );

DROP POLICY IF EXISTS "Admins can manage contests" ON public.contests;
CREATE POLICY "Regional admins manage contests" ON public.contests
  FOR ALL TO authenticated
  USING (public.can_admin_country(auth.uid(), COALESCE(country, 'US')))
  WITH CHECK (public.can_admin_country(auth.uid(), COALESCE(country, 'US')));

DROP POLICY IF EXISTS "Admins can view all audit logs" ON public.audit_logs;
CREATE POLICY "Superadmins view all audit logs" ON public.audit_logs
  FOR SELECT TO authenticated USING (public.is_superadmin(auth.uid()));