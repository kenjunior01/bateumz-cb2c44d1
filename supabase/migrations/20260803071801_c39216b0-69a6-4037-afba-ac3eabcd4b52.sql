CREATE OR REPLACE FUNCTION public.resolve_referral_code(_code text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT user_id FROM public.profiles WHERE referral_code = _code LIMIT 1
$$;
REVOKE ALL ON FUNCTION public.resolve_referral_code(text) FROM public;
GRANT EXECUTE ON FUNCTION public.resolve_referral_code(text) TO anon, authenticated;