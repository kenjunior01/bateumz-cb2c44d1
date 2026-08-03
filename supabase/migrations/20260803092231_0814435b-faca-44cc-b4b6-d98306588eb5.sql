DROP FUNCTION IF EXISTS public.get_business_directory();

CREATE OR REPLACE FUNCTION public.get_business_directory()
RETURNS TABLE(
  user_id uuid,
  display_name text,
  company_name text,
  avatar_url text,
  is_verified boolean,
  slug text,
  province text,
  city text,
  country text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    p.user_id,
    p.display_name,
    p.company_name,
    p.avatar_url,
    p.is_verified,
    p.slug,
    p.province,
    p.city,
    (
      SELECT r.country
      FROM public.raffles r
      WHERE r.business_user_id = p.user_id AND r.country IS NOT NULL
      GROUP BY r.country
      ORDER BY count(*) DESC, max(r.created_at) DESC
      LIMIT 1
    ) AS country
  FROM public.profiles p
  WHERE EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = p.user_id AND ur.role = 'business'::app_role
  );
$$;

REVOKE ALL ON FUNCTION public.get_business_directory() FROM public;
GRANT EXECUTE ON FUNCTION public.get_business_directory() TO anon, authenticated, service_role;