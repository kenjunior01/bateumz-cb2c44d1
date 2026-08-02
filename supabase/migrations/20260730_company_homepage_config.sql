-- Add homepage customization fields to company_branding
-- Enables businesses to have fully personalized, niche-based public profiles

ALTER TABLE public.company_branding
  ADD COLUMN IF NOT EXISTS niche TEXT DEFAULT 'entertainment',
  ADD COLUMN IF NOT EXISTS hero_title TEXT,
  ADD COLUMN IF NOT EXISTS hero_subtitle TEXT,
  ADD COLUMN IF NOT EXISTS hero_cta_text TEXT DEFAULT 'Começar a Jogar',
  ADD COLUMN IF NOT EXISTS hero_cta_link TEXT DEFAULT '/lives',
  ADD COLUMN IF NOT EXISTS about_text TEXT,
  ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS homepage_layout TEXT DEFAULT 'showcase',
  ADD COLUMN IF NOT EXISTS featured_badge TEXT,
  ADD COLUMN IF NOT EXISTS show_leaderboard BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_games BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_lives BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_stats BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS custom_css TEXT,
  ADD COLUMN IF NOT EXISTS overlay_style TEXT DEFAULT 'modern';

-- Comment on niche field
COMMENT ON COLUMN public.company_branding.niche IS 'Business niche for tailored UI: entertainment, gaming, restaurant, retail, education, fitness, music, fashion, tech, food, beauty, sports, casino, charity, other';
COMMENT ON COLUMN public.company_branding.homepage_layout IS 'Layout style: showcase, minimal, bold, gallery, story, immersive';
