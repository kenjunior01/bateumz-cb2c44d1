-- Add slug column to companies table for user-friendly URLs
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS slug text UNIQUE;

-- Create index for faster slug lookups
CREATE INDEX IF NOT EXISTS idx_companies_slug ON public.companies(slug);

-- Function to generate slug from company name
CREATE OR REPLACE FUNCTION generate_company_slug(name text)
RETURNS text AS $$
BEGIN
  RETURN lower(
    regexp_replace(
      regexp_replace(name, '[^a-zA-Z0-9\s-]', '', 'g'),
      '\s+', '-', 'g'
    )
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-generate slug on insert
CREATE OR REPLACE FUNCTION set_company_slug()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL THEN
    NEW.slug := generate_company_slug(NEW.name);
    -- Ensure uniqueness by appending a counter if needed
    WHILE EXISTS(SELECT 1 FROM public.companies WHERE slug = NEW.slug AND id != NEW.id) LOOP
      NEW.slug := NEW.slug || '-' || substr(NEW.id::text, 1, 4);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_set_company_slug ON public.companies;
CREATE TRIGGER trigger_set_company_slug
BEFORE INSERT OR UPDATE ON public.companies
FOR EACH ROW
EXECUTE FUNCTION set_company_slug();

-- Update existing companies with slugs
UPDATE public.companies 
SET slug = generate_company_slug(name) 
WHERE slug IS NULL;
