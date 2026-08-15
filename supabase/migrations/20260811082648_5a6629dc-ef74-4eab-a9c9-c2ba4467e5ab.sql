-- 1. Enum value (not used in this transaction)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_manager';

-- 2. regions: missing columns used by the app
ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS country_name TEXT,
  ADD COLUMN IF NOT EXISTS language_code TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS currency_code TEXT DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS description TEXT,
  ADD COLUMN IF NOT EXISTS user_count INTEGER NOT NULL DEFAULT 0;

UPDATE public.regions SET country_name = COALESCE(country_name, label, country_code),
  language_code = COALESCE(language_code, default_language, 'en'),
  currency_code = COALESCE(currency_code, currency, 'USD');

ALTER TABLE public.scheduled_lives ADD COLUMN IF NOT EXISTS region_id UUID REFERENCES public.regions(id) ON DELETE SET NULL;

-- 3. regional_managers
CREATE TABLE IF NOT EXISTS public.regional_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  user_email TEXT,
  user_name TEXT,
  avatar_url TEXT,
  region_ids UUID[] NOT NULL DEFAULT '{}',
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('manager','senior_manager')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_managers TO authenticated;
GRANT ALL ON public.regional_managers TO service_role;
ALTER TABLE public.regional_managers ENABLE ROW LEVEL SECURITY;

-- 4. region_managers junction
CREATE TABLE IF NOT EXISTS public.region_managers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  manager_id UUID NOT NULL REFERENCES public.regional_managers(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (region_id, manager_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.region_managers TO authenticated;
GRANT ALL ON public.region_managers TO service_role;
ALTER TABLE public.region_managers ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.regions ADD COLUMN IF NOT EXISTS manager_id UUID REFERENCES public.regional_managers(id) ON DELETE SET NULL;

-- 5. regional_branding
CREATE TABLE IF NOT EXISTS public.regional_branding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL UNIQUE REFERENCES public.regions(id) ON DELETE CASCADE,
  theme_name TEXT DEFAULT 'default',
  primary_color TEXT DEFAULT '#FF6B35',
  secondary_color TEXT DEFAULT '#004E89',
  accent_color TEXT DEFAULT '#F7B801',
  background_color TEXT DEFAULT '#0B1220',
  text_color TEXT DEFAULT '#FFFFFF',
  font_family TEXT DEFAULT 'default',
  custom_css TEXT,
  logo_url TEXT,
  banner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regional_branding TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_branding TO authenticated;
GRANT ALL ON public.regional_branding TO service_role;
ALTER TABLE public.regional_branding ENABLE ROW LEVEL SECURITY;

-- 6. regional_settings
CREATE TABLE IF NOT EXISTS public.regional_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL UNIQUE REFERENCES public.regions(id) ON DELETE CASCADE,
  enable_spin_wheel BOOLEAN NOT NULL DEFAULT true,
  enable_millionaire_game BOOLEAN NOT NULL DEFAULT true,
  enable_challenge_games BOOLEAN NOT NULL DEFAULT true,
  enable_live_games BOOLEAN NOT NULL DEFAULT true,
  maintenance_mode BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regional_settings TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_settings TO authenticated;
GRANT ALL ON public.regional_settings TO service_role;
ALTER TABLE public.regional_settings ENABLE ROW LEVEL SECURITY;

-- 7. regional_translations
CREATE TABLE IF NOT EXISTS public.regional_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  language_code TEXT NOT NULL DEFAULT 'en',
  translation_key TEXT NOT NULL,
  translation_value TEXT NOT NULL,
  is_custom BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (region_id, language_code, translation_key)
);
GRANT SELECT ON public.regional_translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_translations TO authenticated;
GRANT ALL ON public.regional_translations TO service_role;
ALTER TABLE public.regional_translations ENABLE ROW LEVEL SECURITY;

-- 8. regional_announcements
CREATE TABLE IF NOT EXISTS public.regional_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL UNIQUE REFERENCES public.regions(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL DEFAULT '',
  cta_label TEXT DEFAULT '',
  cta_url TEXT DEFAULT '',
  updated_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.regional_announcements TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.regional_announcements TO authenticated;
GRANT ALL ON public.regional_announcements TO service_role;
ALTER TABLE public.regional_announcements ENABLE ROW LEVEL SECURITY;

-- 9. native_games
CREATE TABLE IF NOT EXISTS public.native_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Game',
  type TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.native_games TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.native_games TO authenticated;
GRANT ALL ON public.native_games TO service_role;
ALTER TABLE public.native_games ENABLE ROW LEVEL SECURITY;

-- 10. Helper functions
CREATE OR REPLACE FUNCTION public.is_platform_admin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = _user_id AND ur.role IN ('admin','superadmin'));
$$;
REVOKE EXECUTE ON FUNCTION public.is_platform_admin(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_platform_admin(uuid) TO authenticated, anon, service_role;

CREATE OR REPLACE FUNCTION public.is_regional_manager_for_region(p_region_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.regional_managers rm
    WHERE rm.user_id = auth.uid()
      AND rm.is_active = true
      AND (rm.region_ids @> ARRAY[p_region_id]
           OR EXISTS (SELECT 1 FROM public.region_managers j WHERE j.manager_id = rm.id AND j.region_id = p_region_id))
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_regional_manager_for_region(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_regional_manager_for_region(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_my_managed_regions()
RETURNS TABLE(id uuid, country_code text, label text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT DISTINCT r.id, r.country_code, r.label, r.is_active
  FROM public.regions r
  WHERE public.is_regional_manager_for_region(r.id);
$$;
REVOKE EXECUTE ON FUNCTION public.get_my_managed_regions() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_my_managed_regions() TO authenticated, service_role;

-- 11. Policies
DROP POLICY IF EXISTS "rm_admin_all" ON public.regional_managers;
CREATE POLICY "rm_admin_all" ON public.regional_managers FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "rm_read_own" ON public.regional_managers;
CREATE POLICY "rm_read_own" ON public.regional_managers FOR SELECT TO authenticated USING (user_id = auth.uid());
DROP POLICY IF EXISTS "rm_update_own" ON public.regional_managers;
CREATE POLICY "rm_update_own" ON public.regional_managers FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "rjm_admin_all" ON public.region_managers;
CREATE POLICY "rjm_admin_all" ON public.region_managers FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid())) WITH CHECK (public.is_platform_admin(auth.uid()));
DROP POLICY IF EXISTS "rjm_read_own" ON public.region_managers;
CREATE POLICY "rjm_read_own" ON public.region_managers FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.regional_managers rm WHERE rm.id = manager_id AND rm.user_id = auth.uid()));

DROP POLICY IF EXISTS "rbranding_public_read" ON public.regional_branding;
CREATE POLICY "rbranding_public_read" ON public.regional_branding FOR SELECT USING (true);
DROP POLICY IF EXISTS "rbranding_manage" ON public.regional_branding;
CREATE POLICY "rbranding_manage" ON public.regional_branding FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id));

DROP POLICY IF EXISTS "rsettings_public_read" ON public.regional_settings;
CREATE POLICY "rsettings_public_read" ON public.regional_settings FOR SELECT USING (true);
DROP POLICY IF EXISTS "rsettings_manage" ON public.regional_settings;
CREATE POLICY "rsettings_manage" ON public.regional_settings FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id));

DROP POLICY IF EXISTS "rtrans_public_read" ON public.regional_translations;
CREATE POLICY "rtrans_public_read" ON public.regional_translations FOR SELECT USING (true);
DROP POLICY IF EXISTS "rtrans_manage" ON public.regional_translations;
CREATE POLICY "rtrans_manage" ON public.regional_translations FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id));

DROP POLICY IF EXISTS "ra_public_read" ON public.regional_announcements;
CREATE POLICY "ra_public_read" ON public.regional_announcements FOR SELECT USING (true);
DROP POLICY IF EXISTS "ra_manage" ON public.regional_announcements;
CREATE POLICY "ra_manage" ON public.regional_announcements FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id));

DROP POLICY IF EXISTS "ng_public_read" ON public.native_games;
CREATE POLICY "ng_public_read" ON public.native_games FOR SELECT USING (true);
DROP POLICY IF EXISTS "ng_manage" ON public.native_games;
CREATE POLICY "ng_manage" ON public.native_games FOR ALL TO authenticated
  USING (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id))
  WITH CHECK (public.is_platform_admin(auth.uid()) OR public.is_regional_manager_for_region(region_id));

DROP POLICY IF EXISTS "regions_manager_update" ON public.regions;
CREATE POLICY "regions_manager_update" ON public.regions FOR UPDATE TO authenticated
  USING (public.is_regional_manager_for_region(id)) WITH CHECK (public.is_regional_manager_for_region(id));

-- 12. Triggers
DROP TRIGGER IF EXISTS regional_managers_updated_at ON public.regional_managers;
CREATE TRIGGER regional_managers_updated_at BEFORE UPDATE ON public.regional_managers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS regional_branding_updated_at ON public.regional_branding;
CREATE TRIGGER regional_branding_updated_at BEFORE UPDATE ON public.regional_branding FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS regional_settings_updated_at ON public.regional_settings;
CREATE TRIGGER regional_settings_updated_at BEFORE UPDATE ON public.regional_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS regional_translations_updated_at ON public.regional_translations;
CREATE TRIGGER regional_translations_updated_at BEFORE UPDATE ON public.regional_translations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS regional_announcements_updated_at ON public.regional_announcements;
CREATE TRIGGER regional_announcements_updated_at BEFORE UPDATE ON public.regional_announcements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
DROP TRIGGER IF EXISTS native_games_updated_at ON public.native_games;
CREATE TRIGGER native_games_updated_at BEFORE UPDATE ON public.native_games FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 13. Indexes
CREATE INDEX IF NOT EXISTS idx_regional_managers_user_id ON public.regional_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_region_managers_region ON public.region_managers(region_id);
CREATE INDEX IF NOT EXISTS idx_region_managers_manager ON public.region_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_native_games_region ON public.native_games(region_id);
CREATE INDEX IF NOT EXISTS idx_regional_translations_region ON public.regional_translations(region_id, language_code);

-- 14. Seed defaults for existing regions
INSERT INTO public.regional_branding (region_id, primary_color, secondary_color, theme_name)
SELECT r.id, COALESCE(r.primary_color, '#FF6B35'), COALESCE(r.secondary_color, '#004E89'), 'default'
FROM public.regions r
ON CONFLICT (region_id) DO NOTHING;

INSERT INTO public.regional_settings (region_id) SELECT r.id FROM public.regions r
ON CONFLICT (region_id) DO NOTHING;

INSERT INTO public.regional_announcements (region_id) SELECT r.id FROM public.regions r
ON CONFLICT (region_id) DO NOTHING;