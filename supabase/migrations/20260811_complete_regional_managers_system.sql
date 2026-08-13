-- ============================================================
-- COMPLETE REGIONAL MANAGERS SYSTEM
-- Consolidated migration for Supabase SQL Editor
-- Date: 2026-08-11
--
-- WHAT THIS DOES:
--   1. Adds 'regional_manager' to app_role enum (idempotent)
--   2. Creates missing tables: regional_announcements, native_games
--   3. Adds missing columns to regions table
--   4. Creates all RLS policies for regional managers
--   5. Creates helper functions for region management
--   6. Seeds additional regions (IN, ES, FR, MZ, AO, etc.)
--   7. Creates indexes for performance
--
-- INSTRUCTIONS:
--   1. Open Supabase Dashboard > SQL Editor
--   2. Paste this entire file
--   3. Click "Run"
--   4. After success, re-generate types:
--      npx supabase gen types typescript > src/integrations/supabase/types.ts
--
-- SAFE TO RUN MULTIPLE TIMES (all operations are idempotent)
-- ============================================================

-- ============================================================
-- PART 1: ADD regional_manager TO app_role ENUM
-- ============================================================
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
      AND enumlabel = 'regional_manager'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_manager';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  NULL;
END $$;

-- ============================================================
-- PART 2: MISSING TABLES
-- ============================================================

-- 2a. regional_announcements (used by RegionalManagerPanel)
CREATE TABLE IF NOT EXISTS public.regional_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  text TEXT NOT NULL DEFAULT '',
  cta_label TEXT DEFAULT '',
  cta_url TEXT DEFAULT '',
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(region_id) -- One announcement per region
);

-- 2b. native_games (used by RegionalManagerPanel)
CREATE TABLE IF NOT EXISTS public.native_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id UUID NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'New Game',
  type TEXT NOT NULL DEFAULT 'custom',
  is_active BOOLEAN NOT NULL DEFAULT false,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- PART 3: ADD MISSING COLUMNS TO regions TABLE
-- ============================================================
DO $$
BEGIN
  -- label column (used extensively in frontend)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'label') THEN
    ALTER TABLE public.regions ADD COLUMN label TEXT;
  END IF;

  -- flag emoji column
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'flag') THEN
    ALTER TABLE public.regions ADD COLUMN flag TEXT;
  END IF;

  -- primary/secondary/accent color columns for region themes
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'primary_color') THEN
    ALTER TABLE public.regions ADD COLUMN primary_color VARCHAR(7) DEFAULT '#FF6B35';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'secondary_color') THEN
    ALTER TABLE public.regions ADD COLUMN secondary_color VARCHAR(7) DEFAULT '#004E89';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'accent_color') THEN
    ALTER TABLE public.regions ADD COLUMN accent_color VARCHAR(7) DEFAULT '#F7B801';
  END IF;

  -- logo/banner URLs
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'logo_url') THEN
    ALTER TABLE public.regions ADD COLUMN logo_url TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'banner_url') THEN
    ALTER TABLE public.regions ADD COLUMN banner_url TEXT;
  END IF;

  -- tagline
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'tagline') THEN
    ALTER TABLE public.regions ADD COLUMN tagline TEXT;
  END IF;

  -- custom_css
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'custom_css') THEN
    ALTER TABLE public.regions ADD COLUMN custom_css TEXT;
  END IF;

  -- manager_id FK to regional_managers
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'manager_id') THEN
    ALTER TABLE public.regions ADD COLUMN manager_id UUID REFERENCES public.regional_managers(id) ON DELETE SET NULL;
  END IF;

  -- user_count cache
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'user_count') THEN
    ALTER TABLE public.regions ADD COLUMN user_count INTEGER DEFAULT 0;
  END IF;

  -- is_active flag
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'is_active') THEN
    ALTER TABLE public.regions ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT true;
  END IF;

  -- description
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'description') THEN
    ALTER TABLE public.regions ADD COLUMN description TEXT;
  END IF;

  -- timezone
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'timezone') THEN
    ALTER TABLE public.regions ADD COLUMN timezone TEXT DEFAULT 'UTC';
  END IF;

  -- default_language (alias for language_code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'default_language') THEN
    ALTER TABLE public.regions ADD COLUMN default_language TEXT DEFAULT 'en';
  END IF;

  -- currency (alias for currency_code)
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'currency') THEN
    ALTER TABLE public.regions ADD COLUMN currency TEXT DEFAULT 'EUR';
  END IF;

  -- updated_at
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'regions' AND column_name = 'updated_at') THEN
    ALTER TABLE public.regions ADD COLUMN updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;

-- ============================================================
-- PART 4: UPDATE REGION LABELS + FLAGS (idempotent upsert)
-- ============================================================
INSERT INTO public.regions (country_code, country_name, label, flag, default_language, currency, timezone, is_active)
VALUES
  ('PT', 'Portugal', 'Portugal', '\uD83C\uDDF5\uD83C\uDDF9', 'pt', 'EUR', 'Europe/Lisbon', true),
  ('BR', 'Brazil', 'Brasil', '\uD83C\uDDE7\uD83C\uDDF7', 'pt-BR', 'BRL', 'America/Sao_Paulo', true),
  ('ES', 'Spain', 'Espana', '\uD83C\uDDEA\uD83C\uDDE8', 'es', 'EUR', 'Europe/Madrid', true),
  ('FR', 'France', 'France', '\uD83C\uDDEB\uD83C\uDDF7', 'fr', 'EUR', 'Europe/Paris', true),
  ('US', 'United States', 'United States', '\uD83C\uDDFA\uD83C\uDDF8', 'en', 'USD', 'America/New_York', true),
  ('IN', 'India', 'India', '\uD83C\uDDEE\uD83C\uDDF3', 'hi', 'INR', 'Asia/Kolkata', true),
  ('MZ', 'Mozambique', 'Mocambique', '\uD83C\uDDEFF\uD83C\uDDF2', 'pt', 'MZN', 'Africa/Maputo', true),
  ('AO', 'Angola', 'Angola', '\uD83C\uDDE6\uD83C\uDDF4', 'pt', 'AOA', 'Africa/Luanda', true),
  ('CA', 'Canada', 'Canada', '\uD83C\uDDE8\uD83C\uDDE6', 'en', 'CAD', 'America/Toronto', true),
  ('GB', 'United Kingdom', 'United Kingdom', '\uD83C\uDDEC\uD83C\uDDE7', 'en', 'GBP', 'Europe/London', true),
  ('DE', 'Germany', 'Alemanha', '\uD83C\uDDE9\uD83C\uDDEA', 'de', 'EUR', 'Europe/Berlin', true),
  ('IT', 'Italy', 'Italia', '\uD83C\uDDEE\uD83C\uDDF9', 'it', 'EUR', 'Europe/Rome', true)
ON CONFLICT (country_code) DO UPDATE SET
  label = EXCLUDED.label,
  flag = EXCLUDED.flag,
  country_name = EXCLUDED.country_name,
  default_language = EXCLUDED.default_language,
  currency = EXCLUDED.currency,
  timezone = EXCLUDED.timezone,
  is_active = EXCLUDED.is_active;

-- ============================================================
-- PART 5: ENSURE RLS IS ENABLED + GRANTS
-- ============================================================
ALTER TABLE public.regional_announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.native_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_managers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.region_managers ENABLE ROW LEVEL SECURITY;

GRANT ALL ON public.regional_announcements TO authenticated;
GRANT SELECT ON public.regional_announcements TO anon;
GRANT ALL ON public.native_games TO authenticated;
GRANT SELECT ON public.native_games TO anon;
GRANT ALL ON public.regional_managers TO authenticated;
GRANT ALL ON public.region_managers TO authenticated;
GRANT USAGE ON TYPE public.app_role TO authenticated;

-- ============================================================
-- PART 6: RLS POLICIES FOR REGIONAL MANAGERS
-- ============================================================

-- 6a. regional_announcements: public read, managers can write their regions
CREATE POLICY "ra_public_read" ON public.regional_announcements
  FOR SELECT USING (true);

CREATE POLICY "ra_regional_manager_all" ON public.regional_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_announcements.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_announcements.region_id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6b. native_games: public read, managers can write their regions
CREATE POLICY "ng_public_read" ON public.native_games
  FOR SELECT USING (true);

CREATE POLICY "ng_regional_manager_all" ON public.native_games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.native_games.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.native_games.region_id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6c. regional_managers: admins can do everything, managers can read own
CREATE POLICY "rm_admin_all" ON public.regional_managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

CREATE POLICY "rm_manager_read_own" ON public.regional_managers
  FOR SELECT USING (
    user_id = auth.uid()
  );

CREATE POLICY "rm_manager_update_own" ON public.regional_managers
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- 6d. region_managers junction: admins can do everything
CREATE POLICY "rjm_admin_all" ON public.region_managers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6e. regions: managers can read/update their assigned regions
CREATE POLICY "regions_public_read" ON public.regions
  FOR SELECT USING (true);

CREATE POLICY "regions_regional_manager_update" ON public.regions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regions.id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regions.id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6f. regional_branding: managers can manage their regions' branding
CREATE POLICY "rbranding_manager_all" ON public.regional_branding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_branding.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_branding.region_id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6g. regional_settings: managers can manage their regions' settings
CREATE POLICY "rsettings_manager_all" ON public.regional_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_settings.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_settings.region_id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- 6h. regional_translations: managers can manage their regions' translations
CREATE POLICY "rtrans_manager_all" ON public.regional_translations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_translations.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_translations.region_id
             ))
    )
    OR EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role IN ('admin', 'superadmin')
    )
  );

-- ============================================================
-- PART 7: INDEXES FOR PERFORMANCE
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_regional_announcements_region_id ON public.regional_announcements(region_id);
CREATE INDEX IF NOT EXISTS idx_native_games_region_id ON public.native_games(region_id);
CREATE INDEX IF NOT EXISTS idx_native_games_is_active ON public.native_games(is_active);
CREATE INDEX IF NOT EXISTS idx_regional_managers_user_id ON public.regional_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_regional_managers_is_active ON public.regional_managers(is_active);
CREATE INDEX IF NOT EXISTS idx_regional_managers_role ON public.regional_managers(role);
CREATE INDEX IF NOT EXISTS idx_region_managers_region_id ON public.region_managers(region_id);
CREATE INDEX IF NOT EXISTS idx_region_managers_manager_id ON public.region_managers(manager_id);
CREATE INDEX IF NOT EXISTS idx_regions_country_code ON public.regions(country_code);
CREATE INDEX IF NOT EXISTS idx_regions_is_active ON public.regions(is_active);

-- ============================================================
-- PART 8: UPDATED_AT TRIGGERS
-- ============================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER update_regional_announcements_updated_at
    BEFORE UPDATE ON public.regional_announcements
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_native_games_updated_at
    BEFORE UPDATE ON public.native_games
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_regions_updated_at
    BEFORE UPDATE ON public.regions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- PART 9: HELPER FUNCTIONS
-- ============================================================

-- Check if current user is a regional manager for a given region
CREATE OR REPLACE FUNCTION public.is_regional_manager_for_region(p_region_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.regional_managers rm
    WHERE rm.user_id = auth.uid()
      AND rm.is_active = true
      AND (rm.region_ids @> ARRAY[p_region_id] OR
           EXISTS (
             SELECT 1 FROM public.region_managers j
             WHERE j.manager_id = rm.id AND j.region_id = p_region_id
           ))
  );
$$;

-- Get all regions managed by the current user
CREATE OR REPLACE FUNCTION public.get_my_managed_regions()
RETURNS TABLE(id uuid, country_code text, label text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.id, r.country_code, r.label, r.is_active
  FROM public.regions r
  INNER JOIN public.regional_managers rm ON rm.is_active = true
  WHERE rm.user_id = auth.uid()
    AND (rm.region_ids @> ARRAY[r.id] OR
         EXISTS (
           SELECT 1 FROM public.region_managers j
           WHERE j.manager_id = rm.id AND j.region_id = r.id
         ));
$$;

-- Update last_login for regional managers on auth event
CREATE OR REPLACE FUNCTION public.update_regional_manager_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.regional_managers
  SET last_login = now()
  WHERE user_id = auth.uid();
  RETURN NEW;
END;
$$;

-- Get region stats (for admin dashboard)
CREATE OR REPLACE FUNCTION public.get_region_stats(p_region_id uuid)
RETURNS TABLE(
  total_users bigint,
  total_games bigint,
  total_lives bigint,
  total_revenue numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    (SELECT count(*) FROM public.profiles) AS total_users,
    (SELECT count(*) FROM public.native_games WHERE region_id = p_region_id) AS total_games,
    (SELECT count(*) FROM public.scheduled_lives WHERE region_id = p_region_id) AS total_lives,
    0::numeric AS total_revenue;
$$;

-- ============================================================
-- PART 10: DEFAULT BRANDING + SETTINGS FOR NEW REGIONS
-- ============================================================
INSERT INTO public.regional_branding (region_id, primary_color, secondary_color, theme_name)
SELECT r.id, '#FF6B35', '#004E89', 'default'
FROM public.regions r
WHERE NOT EXISTS (
  SELECT 1 FROM public.regional_branding rb WHERE rb.region_id = r.id
);

INSERT INTO public.regional_settings (region_id)
SELECT r.id
FROM public.regions r
WHERE NOT EXISTS (
  SELECT 1 FROM public.regional_settings rs WHERE rs.region_id = r.id
);

INSERT INTO public.regional_announcements (region_id, enabled, text)
SELECT r.id, false, ''
FROM public.regions r
WHERE NOT EXISTS (
  SELECT 1 FROM public.regional_announcements ra WHERE ra.region_id = r.id
);

-- ============================================================
-- PART 11: USAGE EXAMPLES (COMMENTS ONLY - NOT EXECUTED)
-- ============================================================
--
-- TO CREATE A REGIONAL MANAGER:
--
-- Step 1: Insert the user_role
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<user-uuid>', 'regional_manager');
--
-- Step 2: Create the manager record
--   INSERT INTO public.regional_managers (user_id, user_email, user_name, region_ids, role)
--   VALUES (
--     '<user-uuid>',
--     'manager@example.com',
--     'Manager Name',
--     ARRAY['<region-uuid>'],
--     'manager'
--   );
--
-- Step 3 (optional): Link via junction table for many-to-many
--   INSERT INTO public.region_managers (region_id, manager_id)
--   VALUES ('<region-uuid>', '<manager-record-uuid>');
--
-- TO PROMOTE TO SENIOR MANAGER:
--   UPDATE public.regional_managers
--   SET role = 'senior_manager'
--   WHERE user_id = '<user-uuid>';
--
-- TO ASSIGN MULTIPLE REGIONS:
--   UPDATE public.regional_managers
--   SET region_ids = ARRAY['<region-uuid-1>', '<region-uuid-2>']
--   WHERE user_id = '<user-uuid>';
--
-- TO CHECK IF A USER IS A REGIONAL MANAGER:
--   SELECT * FROM public.is_regional_manager_for_region('<region-uuid>');
--
-- ============================================================
-- END OF MIGRATION
-- ============================================================
