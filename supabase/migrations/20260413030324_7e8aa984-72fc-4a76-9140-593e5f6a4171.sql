
-- Create a public view with only non-sensitive fields
CREATE VIEW public.profiles_public
WITH (security_invoker = on) AS
SELECT user_id, display_name, avatar_url, company_name, referral_code, is_verified, created_at
FROM public.profiles;

-- Replace the overly permissive SELECT policy with owner+admin only
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

-- Admin policy already exists, keep it
