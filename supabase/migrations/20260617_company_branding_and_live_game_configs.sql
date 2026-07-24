
-- Company Branding Settings
CREATE TABLE IF NOT EXISTS public.company_branding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id),
  company_name text,
  company_slogan text,
  company_logo_url text,
  primary_color text DEFAULT '#fbbf24',
  secondary_color text DEFAULT '#3b82f6',
  accent_color text DEFAULT '#8b5cf6',
  background_color text DEFAULT '#0a0e17',
  text_color text DEFAULT '#ffffff',
  background_image_url text,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.company_branding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own branding" 
  ON public.company_branding FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own branding" 
  ON public.company_branding FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own branding" 
  ON public.company_branding FOR UPDATE 
  USING (auth.uid() = user_id);

-- Live Game Config Saved to DB (not just local storage)
CREATE TABLE IF NOT EXISTS public.live_game_configs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  region_id uuid REFERENCES public.regions(id),
  config_name text DEFAULT 'Configuração Padrão',
  is_active boolean DEFAULT true,
  tap_duration integer DEFAULT 5,
  quiz_questions integer DEFAULT 5,
  quiz_time_per_q integer DEFAULT 8,
  mystery_high numeric DEFAULT 0.25,
  mystery_low numeric DEFAULT 0.4,
  mystery_none numeric DEFAULT 0.35,
  created_at timestamptz NOT NULL DEFAULT NOW(),
  updated_at timestamptz NOT NULL DEFAULT NOW()
);

ALTER TABLE public.live_game_configs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own configs" 
  ON public.live_game_configs FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own configs" 
  ON public.live_game_configs FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own configs" 
  ON public.live_game_configs FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own configs" 
  ON public.live_game_configs FOR DELETE 
  USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_company_branding_updated_at BEFORE UPDATE ON public.company_branding
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_live_game_configs_updated_at BEFORE UPDATE ON public.live_game_configs
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant necessary permissions
GRANT ALL ON public.company_branding TO authenticated;
GRANT ALL ON public.live_game_configs TO authenticated;

