DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker = off) AS
  SELECT user_id, display_name, avatar_url, company_name, is_verified, created_at, slug
  FROM public.profiles;

ALTER VIEW public.profiles_public OWNER TO postgres;
GRANT SELECT ON public.profiles_public TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_business_directory()
RETURNS TABLE(user_id uuid, display_name text, company_name text, avatar_url text, is_verified boolean, slug text)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.user_id, p.display_name, p.company_name, p.avatar_url, p.is_verified, p.slug
  FROM public.profiles p
  JOIN public.user_roles r ON r.user_id = p.user_id AND r.role = 'business'
$$;

REVOKE ALL ON FUNCTION public.get_business_directory() FROM public;
GRANT EXECUTE ON FUNCTION public.get_business_directory() TO anon, authenticated;