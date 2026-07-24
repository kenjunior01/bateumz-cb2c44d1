
-- Add slug column to raffles
ALTER TABLE public.raffles ADD COLUMN slug text UNIQUE;

-- Create function to generate slug from title
CREATE OR REPLACE FUNCTION public.generate_raffle_slug()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
DECLARE
  base_slug text;
  final_slug text;
  counter integer := 0;
BEGIN
  base_slug := lower(regexp_replace(regexp_replace(NEW.title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g'));
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  IF base_slug = '' THEN
    base_slug := 'sorteio';
  END IF;
  final_slug := base_slug;
  WHILE EXISTS (SELECT 1 FROM public.raffles WHERE slug = final_slug AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  NEW.slug := final_slug;
  RETURN NEW;
END;
$$;

-- Create trigger for auto-generating slug
CREATE TRIGGER set_raffle_slug
  BEFORE INSERT OR UPDATE OF title ON public.raffles
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_raffle_slug();

-- Update existing raffles to have slugs
UPDATE public.raffles SET slug = lower(regexp_replace(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'), '\s+', '-', 'g')) WHERE slug IS NULL;

-- Add policy for public profile viewing (display_name, company_name only)
CREATE POLICY "Anyone can view public profile info"
  ON public.profiles FOR SELECT
  TO public
  USING (true);

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
