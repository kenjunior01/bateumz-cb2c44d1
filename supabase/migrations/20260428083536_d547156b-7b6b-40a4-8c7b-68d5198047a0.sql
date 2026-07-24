-- 1. Lock down internal SECURITY DEFINER functions (only service_role should call)
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;

-- 2. increment_prestacao_product_views: keep callable but tighten — switch to SECURITY INVOKER + RLS-friendly
DROP FUNCTION IF EXISTS public.increment_prestacao_product_views(uuid);
CREATE OR REPLACE FUNCTION public.increment_prestacao_product_views(_product_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.prestacao_products
     SET views_count = COALESCE(views_count, 0) + 1
   WHERE id = _product_id AND status = 'active';
$$;
REVOKE EXECUTE ON FUNCTION public.increment_prestacao_product_views(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_prestacao_product_views(uuid) TO anon, authenticated;

-- 3. Replace overly permissive insert policy on prestacao_product_leads
DROP POLICY IF EXISTS "Anyone can submit product leads" ON public.prestacao_product_leads;
CREATE POLICY "Public can submit product leads with basic data"
ON public.prestacao_product_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (
  total_price >= 0
  AND down_payment >= 0
  AND months > 0 AND months <= 120
  AND monthly_estimate >= 0
  AND (coalesce(visitor_name, '') <> '' OR coalesce(visitor_whatsapp, '') <> '' OR visitor_user_id IS NOT NULL)
  AND length(coalesce(visitor_name, '')) <= 120
  AND length(coalesce(visitor_whatsapp, '')) <= 30
  AND length(coalesce(notes, '')) <= 2000
);
