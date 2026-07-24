-- Regional Configuration System for Multi-Tenant CEO Management
-- This allows each region (country) to have its own CEO with custom branding and languages

-- 1. Create regions table
CREATE TABLE IF NOT EXISTS public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  country_code varchar(2) UNIQUE NOT NULL, -- ISO 3166-1 alpha-2 (e.g., 'PT', 'BR', 'ES')
  country_name varchar(100) NOT NULL,
  region_name varchar(100),
  timezone varchar(50) DEFAULT 'UTC',
  currency_code varchar(3) DEFAULT 'EUR',
  language_code varchar(5) DEFAULT 'en', -- Default language for region
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 2. Create regional CEOs table
CREATE TABLE IF NOT EXISTS public.regional_ceos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name varchar(255) NOT NULL,
  email varchar(255) NOT NULL,
  phone varchar(20),
  is_active boolean DEFAULT true,
  permissions jsonb DEFAULT '{"manage_branding": true, "manage_translations": true, "manage_users": true}',
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(region_id, user_id)
);

-- 3. Create regional branding table
CREATE TABLE IF NOT EXISTS public.regional_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL UNIQUE REFERENCES public.regions(id) ON DELETE CASCADE,
  primary_color varchar(7) DEFAULT '#FF6B35', -- Hex color
  secondary_color varchar(7) DEFAULT '#004E89',
  accent_color varchar(7) DEFAULT '#F7B801',
  background_color varchar(7) DEFAULT '#FFFFFF',
  text_color varchar(7) DEFAULT '#000000',
  logo_url text,
  banner_url text,
  favicon_url text,
  font_family varchar(100) DEFAULT 'Inter, sans-serif',
  theme_name varchar(100) DEFAULT 'default',
  custom_css text, -- Allow custom CSS for advanced customization
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- 4. Create dynamic translations table
CREATE TABLE IF NOT EXISTS public.regional_translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  language_code varchar(5) NOT NULL, -- e.g., 'pt', 'pt-BR', 'en', 'es'
  translation_key varchar(255) NOT NULL, -- e.g., 'live.title'
  translation_value text NOT NULL,
  is_custom boolean DEFAULT false, -- true if CEO manually edited
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now(),
  UNIQUE(region_id, language_code, translation_key)
);

-- 5. Create user region mapping table
CREATE TABLE IF NOT EXISTS public.user_regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid NOT NULL REFERENCES public.regions(id) ON DELETE CASCADE,
  primary_region boolean DEFAULT false, -- User's main region
  created_at timestamp DEFAULT now(),
  UNIQUE(user_id, region_id)
);

-- 6. Create regional settings table for feature flags
CREATE TABLE IF NOT EXISTS public.regional_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region_id uuid NOT NULL UNIQUE REFERENCES public.regions(id) ON DELETE CASCADE,
  enable_spin_wheel boolean DEFAULT true,
  enable_millionaire_game boolean DEFAULT true,
  enable_challenge_games boolean DEFAULT true,
  enable_predictions boolean DEFAULT true,
  enable_live_games boolean DEFAULT true,
  max_concurrent_users integer DEFAULT 10000,
  maintenance_mode boolean DEFAULT false,
  custom_features jsonb DEFAULT '{}', -- Store custom feature flags
  created_at timestamp DEFAULT now(),
  updated_at timestamp DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX idx_regional_ceos_region_id ON public.regional_ceos(region_id);
CREATE INDEX idx_regional_ceos_user_id ON public.regional_ceos(user_id);
CREATE INDEX idx_regional_translations_region_id ON public.regional_translations(region_id);
CREATE INDEX idx_regional_translations_language ON public.regional_translations(language_code);
CREATE INDEX idx_user_regions_user_id ON public.user_regions(user_id);
CREATE INDEX idx_user_regions_region_id ON public.user_regions(region_id);

-- Enable RLS
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_ceos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_branding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_regions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regional_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Regions: Public read, only admins can write
CREATE POLICY "Regions are public" ON public.regions FOR SELECT USING (true);
CREATE POLICY "Only admins can manage regions" ON public.regions FOR INSERT WITH CHECK (auth.role() = 'authenticated' AND EXISTS (SELECT 1 FROM public.regional_ceos WHERE user_id = auth.uid() AND is_active = true));

-- Regional CEOs: Only view own or manage if admin
CREATE POLICY "Users can view their own CEO record" ON public.regional_ceos FOR SELECT USING (user_id = auth.uid() OR auth.role() = 'service_role');
CREATE POLICY "Only admins can manage CEOs" ON public.regional_ceos FOR INSERT WITH CHECK (auth.role() = 'service_role');

-- Regional Branding: Public read
CREATE POLICY "Branding is public" ON public.regional_branding FOR SELECT USING (true);
CREATE POLICY "Only regional CEO can update branding" ON public.regional_branding FOR UPDATE USING (EXISTS (SELECT 1 FROM public.regional_ceos WHERE region_id = regional_branding.region_id AND user_id = auth.uid() AND is_active = true));

-- Regional Translations: Public read
CREATE POLICY "Translations are public" ON public.regional_translations FOR SELECT USING (true);
CREATE POLICY "Only regional CEO can manage translations" ON public.regional_translations FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.regional_ceos WHERE region_id = regional_translations.region_id AND user_id = auth.uid() AND is_active = true));

-- User Regions: Users can view their own
CREATE POLICY "Users can view their regions" ON public.user_regions FOR SELECT USING (user_id = auth.uid());

-- Regional Settings: Public read
CREATE POLICY "Settings are public" ON public.regional_settings FOR SELECT USING (true);
CREATE POLICY "Only regional CEO can update settings" ON public.regional_settings FOR UPDATE USING (EXISTS (SELECT 1 FROM public.regional_ceos WHERE region_id = regional_settings.region_id AND user_id = auth.uid() AND is_active = true));

-- Insert default regions
INSERT INTO public.regions (country_code, country_name, region_name, timezone, currency_code, language_code)
VALUES
  ('PT', 'Portugal', 'Portugal', 'Europe/Lisbon', 'EUR', 'pt'),
  ('BR', 'Brazil', 'Brazil', 'America/Sao_Paulo', 'BRL', 'pt-BR'),
  ('ES', 'Spain', 'Spain', 'Europe/Madrid', 'EUR', 'es'),
  ('FR', 'France', 'France', 'Europe/Paris', 'EUR', 'fr'),
  ('US', 'United States', 'USA', 'America/New_York', 'USD', 'en'),
  ('IN', 'India', 'India', 'Asia/Kolkata', 'INR', 'hi')
ON CONFLICT (country_code) DO NOTHING;

-- Create default branding for each region
INSERT INTO public.regional_branding (region_id, primary_color, secondary_color, theme_name)
SELECT id, '#FF6B35', '#004E89', 'default' FROM public.regions
ON CONFLICT (region_id) DO NOTHING;

-- Create default settings for each region
INSERT INTO public.regional_settings (region_id)
SELECT id FROM public.regions
ON CONFLICT (region_id) DO NOTHING;
