-- ============================================================
-- Regional Managers System
-- Complete management of regions and their managers
-- ============================================================

-- Table: regional_managers
CREATE TABLE IF NOT EXISTS public.regional_managers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email text,
  user_name text NOT NULL,
  avatar_url text,
  region_ids uuid[] DEFAULT '{}',
  role text NOT NULL DEFAULT 'manager' CHECK (role IN ('manager', 'senior_manager')),
  is_active boolean NOT NULL DEFAULT true,
  last_login timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Table: region_managers junction (for many-to-many)
CREATE TABLE IF NOT EXISTS public.region_managers (
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  manager_id uuid NOT NULL REFERENCES public.regional_managers(id) ON DELETE CASCADE,
  assigned_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (region_id, manager_id)
);

-- Add columns to existing regions table if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'manager_id') THEN
    ALTER TABLE public.regions ADD COLUMN manager_id uuid REFERENCES public.regional_managers(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'user_count') THEN
    ALTER TABLE public.regions ADD COLUMN user_count integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'is_active') THEN
    ALTER TABLE public.regions ADD COLUMN is_active boolean NOT NULL DEFAULT true;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'description') THEN
    ALTER TABLE public.regions ADD COLUMN description text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'regions' AND column_name = 'timezone') THEN
    ALTER TABLE public.regions ADD COLUMN timezone text DEFAULT 'UTC';
  END IF;
END $$;

-- RLS Policies
ALTER TABLE public.regional_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all regional managers" ON public.regional_managers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

CREATE POLICY "Admins can insert regional managers" ON public.regional_managers
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

CREATE POLICY "Admins can update regional managers" ON public.regional_managers
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

CREATE POLICY "Admins can delete regional managers" ON public.regional_managers
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

ALTER TABLE public.region_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view region_managers" ON public.region_managers
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

CREATE POLICY "Admins can manage region_managers" ON public.region_managers
  FOR ALL USING (
    EXISTS (SELECT 1 FROM auth.users WHERE auth.uid() = id AND
      (raw_app_meta_data->>'role' = 'admin' OR raw_app_meta_data->>'role' = 'superadmin'))
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_regional_managers_user_id ON public.regional_managers(user_id);
CREATE INDEX IF NOT EXISTS idx_regional_managers_is_active ON public.regional_managers(is_active);
CREATE INDEX IF NOT EXISTS idx_regional_managers_role ON public.regional_managers(role);
CREATE INDEX IF NOT EXISTS idx_region_managers_region_id ON public.region_managers(region_id);
CREATE INDEX IF NOT EXISTS idx_region_managers_manager_id ON public.region_managers(manager_id);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON public.regional_managers;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.regional_managers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Seed default regions if not present
INSERT INTO public.regions (country_code, country_name, label, default_language, currency, timezone, is_active)
VALUES
  ('US', 'United States', 'United States', 'en', 'USD', 'America/New_York', true),
  ('BR', 'Brazil', 'Brazil', 'pt-BR', 'BRL', 'America/Sao_Paulo', true),
  ('PT', 'Portugal', 'Portugal', 'pt', 'EUR', 'Europe/Lisbon', true),
  ('MZ', 'Mozambique', 'Mozambique', 'pt', 'MZN', 'Africa/Maputo', true),
  ('AO', 'Angola', 'Angola', 'pt', 'AOA', 'Africa/Luanda', true),
  ('CA', 'Canada', 'Canada', 'en', 'CAD', 'America/Toronto', true)
ON CONFLICT DO NOTHING;
