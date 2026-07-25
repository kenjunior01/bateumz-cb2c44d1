-- Fix: Grant EXECUTE on can_admin_country and related functions to anon and authenticated
-- This fixes the "permission denied for function can_admin_country" error
-- that was causing white screen on the main page.

GRANT EXECUTE ON FUNCTION public.can_admin_country(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_countries(uuid) TO anon, authenticated;

-- Also ensure there's a base SELECT policy on raffles that doesn't depend on can_admin_country
-- so anon users can always browse active raffles
CREATE POLICY IF NOT EXISTS "Anyone can view active raffles" ON public.raffles
  FOR SELECT USING (status = 'active');

-- Same for contests
CREATE POLICY IF NOT EXISTS "Anyone can view active contests" ON public.contests
  FOR SELECT USING (is_active = true);
