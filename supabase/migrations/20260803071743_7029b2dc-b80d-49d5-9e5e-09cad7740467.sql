-- Remove the permissive social-proofs upload policy (a folder-scoped one already exists)
DROP POLICY IF EXISTS "Auth users can upload social proofs" ON storage.objects;

-- Public profile view: drop the referral code from public exposure
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public
WITH (security_invoker=off) AS
SELECT user_id, display_name, avatar_url, company_name, is_verified, created_at, slug
FROM public.profiles;
GRANT SELECT ON public.profiles_public TO anon, authenticated;