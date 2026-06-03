
-- 1. Extend regions table with theme + language fields
ALTER TABLE public.regions
  ADD COLUMN IF NOT EXISTS name text,
  ADD COLUMN IF NOT EXISTS primary_color text DEFAULT '#0B1F3A',
  ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#C9A24C',
  ADD COLUMN IF NOT EXISTS accent_color text DEFAULT '#B22234',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS tagline text;

-- Add UPDATE policy for regional admins on their own region (theme editing)
DROP POLICY IF EXISTS "Regional admins update own region" ON public.regions;
CREATE POLICY "Regional admins update own region"
  ON public.regions
  FOR UPDATE
  TO authenticated
  USING (public.can_admin_country(auth.uid(), country_code))
  WITH CHECK (public.can_admin_country(auth.uid(), country_code));

DROP POLICY IF EXISTS "Superadmins manage regions" ON public.regions;
CREATE POLICY "Superadmins manage regions"
  ON public.regions
  FOR ALL
  TO authenticated
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

-- 2. Translations table
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL,
  language_code text NOT NULL,
  value text NOT NULL,
  region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (key, language_code, region_id)
);

CREATE INDEX IF NOT EXISTS idx_translations_lookup
  ON public.translations (language_code, region_id, key);

GRANT SELECT ON public.translations TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.translations TO authenticated;
GRANT ALL ON public.translations TO service_role;

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read translations"
  ON public.translations
  FOR SELECT
  USING (true);

CREATE POLICY "Regional admins manage own region translations"
  ON public.translations
  FOR ALL
  TO authenticated
  USING (
    public.is_superadmin(auth.uid())
    OR (
      region_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.regions r
        WHERE r.id = translations.region_id
          AND public.can_admin_country(auth.uid(), r.country_code)
      )
    )
  )
  WITH CHECK (
    public.is_superadmin(auth.uid())
    OR (
      region_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.regions r
        WHERE r.id = translations.region_id
          AND public.can_admin_country(auth.uid(), r.country_code)
      )
    )
  );

-- updated_at trigger
DROP TRIGGER IF EXISTS update_translations_updated_at ON public.translations;
CREATE TRIGGER update_translations_updated_at
  BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_regions_updated_at ON public.regions;
CREATE TRIGGER update_regions_updated_at
  BEFORE UPDATE ON public.regions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
