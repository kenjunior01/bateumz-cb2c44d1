CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker=off) AS
SELECT user_id, display_name, avatar_url, company_name, referral_code, is_verified, created_at, slug
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;