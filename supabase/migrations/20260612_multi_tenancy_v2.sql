-- ============================================================================
-- MULTI-TENANCY V2 & DYNAMIC THEMING ENHANCEMENTS
-- Based on the strategic plan for global scalability
-- ============================================================================

-- 1. Enhance 'regions' table with branding and localization columns
ALTER TABLE public.regions 
ADD COLUMN IF NOT EXISTS domain_prefix text UNIQUE,
ADD COLUMN IF NOT EXISTS default_language text DEFAULT 'en',
ADD COLUMN IF NOT EXISTS theme_colors jsonb DEFAULT '{"primary": "#9b87f5", "secondary": "#7E69AB", "accent": "#F2FCE2"}'::jsonb,
ADD COLUMN IF NOT EXISTS logo_url text,
ADD COLUMN IF NOT EXISTS banner_url text,
ADD COLUMN IF NOT EXISTS custom_css text,
ADD COLUMN IF NOT EXISTS tagline text;

-- 2. Create 'translations' table for dynamic i18n
CREATE TABLE IF NOT EXISTS public.translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid REFERENCES public.regions(id) ON DELETE CASCADE,
  language_code text NOT NULL, -- e.g., 'pt-BR', 'en', 'es'
  key text NOT NULL, -- e.g., 'home.welcome'
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(region_id, language_code, key)
);

ALTER TABLE public.translations ENABLE ROW LEVEL SECURITY;

-- Policies for translations
CREATE POLICY "Anyone can view translations" ON public.translations
  FOR SELECT USING (true);

CREATE POLICY "Superadmins and Regional CEOs manage translations" ON public.translations
  FOR ALL TO authenticated
  USING (
    public.is_superadmin(auth.uid()) 
    OR (
      public.has_role(auth.uid(), 'admin') 
      AND EXISTS (
        SELECT 1 FROM public.admin_regions ar 
        JOIN public.regions r ON r.country_code = ar.country_code
        WHERE ar.user_id = auth.uid() AND r.id = translations.region_id
      )
    )
  );

-- 3. Update existing regions with some default data
UPDATE public.regions SET domain_prefix = 'us', default_language = 'en' WHERE country_code = 'US';
UPDATE public.regions SET domain_prefix = 'pt', default_language = 'pt' WHERE country_code = 'PT';
UPDATE public.regions SET domain_prefix = 'br', default_language = 'pt-BR' WHERE country_code = 'BR';
UPDATE public.regions SET domain_prefix = 'mz', default_language = 'pt' WHERE country_code = 'MZ';
UPDATE public.regions SET domain_prefix = 'ao', default_language = 'pt' WHERE country_code = 'AO';

-- 4. Trigger for updated_at on translations
CREATE TRIGGER trg_translations_updated BEFORE UPDATE ON public.translations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5. Helper function to get theme by country code
CREATE OR REPLACE FUNCTION public.get_regional_theme(_country_code text)
RETURNS jsonb LANGUAGE sql STABLE AS $$
  SELECT jsonb_build_object(
    'primary', theme_colors->>'primary',
    'secondary', theme_colors->>'secondary',
    'accent', theme_colors->>'accent',
    'logo_url', logo_url,
    'banner_url', banner_url,
    'custom_css', custom_css,
    'tagline', tagline
  ) FROM public.regions WHERE country_code = _country_code AND is_active = true;
$$;
