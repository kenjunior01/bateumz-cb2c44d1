ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS slug text;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_slug_unique ON public.profiles (lower(slug)) WHERE slug IS NOT NULL;