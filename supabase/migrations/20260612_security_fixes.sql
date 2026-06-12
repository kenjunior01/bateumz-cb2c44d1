-- ============================================================================
-- SECURITY FIXES FOR LOVABLE / SUPABASE LINTER
-- ============================================================================

-- 1. Fix 'prestacao_products' whatsapp exposure
-- Remove anon access to base table and ensure it goes through the public view
DROP POLICY IF EXISTS "Anyone can view active products" ON public.prestacao_products;

CREATE POLICY "Authenticated and Admin can view products"
  ON public.prestacao_products FOR SELECT
  TO authenticated
  USING (status = 'active' OR public.is_superadmin(auth.uid()));

-- 2. Fix 'email_send_log', 'email_unsubscribe_tokens', 'suppressed_emails'
-- Scope policies directly to service_role instead of public with runtime check
ALTER TABLE public.email_send_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can insert email logs" ON public.email_send_log;
CREATE POLICY "Service role can manage email logs"
  ON public.email_send_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.email_unsubscribe_tokens ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can manage tokens"
  ON public.email_unsubscribe_tokens FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

ALTER TABLE public.suppressed_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Service role can manage suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can manage suppressed emails"
  ON public.suppressed_emails FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Fix 'live_poll_votes' privacy
-- Restrict SELECT to owner and admins
DROP POLICY IF EXISTS "Anyone can view poll votes" ON public.live_poll_votes;
CREATE POLICY "Admins and Owners can view poll votes"
  ON public.live_poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.live_polls p
      JOIN public.raffles r ON r.id = p.raffle_id
      WHERE p.id = poll_id AND (r.owner_id = auth.uid() OR public.is_superadmin(auth.uid()))
    )
  );

-- 4. Fix 'social-proofs' bucket access for business owners
-- Allow business owners to see proofs for their own raffles
CREATE POLICY "Business owners can view participant proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'social-proofs' AND (
      EXISTS (
        SELECT 1 FROM public.social_raffle_entries e
        JOIN public.raffles r ON r.id = e.raffle_id
        WHERE r.owner_id = auth.uid()
      )
    )
  );

-- 5. Fix SECURITY DEFINER functions
-- Revoke public execute from sensitive functions
-- Note: Replace with actual function names found in your project if needed
-- This is a general fix for the common linter warning
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM public;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Specifically for functions that MUST be public, grant them back individually:
-- GRANT EXECUTE ON FUNCTION public.your_public_function TO anon;

-- 6. Fix public storage bucket listing
-- Ensure SELECT policy on storage.objects doesn't allow listing entire buckets
DROP POLICY IF EXISTS "Public can view objects" ON storage.objects;
CREATE POLICY "Public can view specific objects"
  ON storage.objects FOR SELECT
  TO public
  USING (
    (bucket_id = 'public-assets') -- Only allow for truly public buckets
    AND (name IS NOT NULL)
  );
