
-- Security fixes from scan

-- 1) luck_points: restrict insert role to authenticated only
DROP POLICY IF EXISTS "System can insert points" ON public.luck_points;
CREATE POLICY "Authenticated users insert own points"
  ON public.luck_points
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- 2) notifications: business may only notify users who actually participate in their raffle
DROP POLICY IF EXISTS "Business owners and system can insert notifications" ON public.notifications;
CREATE POLICY "Notifications insert scoped"
  ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin'::app_role)
    OR public.has_role(auth.uid(), 'superadmin'::app_role)
    OR (
      raffle_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM public.raffles r
        WHERE r.id = notifications.raffle_id AND r.business_user_id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 FROM public.participants p
        WHERE p.raffle_id = notifications.raffle_id AND p.user_id = notifications.user_id
      )
    )
  );

-- 3) platform_settings: stop fully public read; expose only an allowlisted public view
DROP POLICY IF EXISTS "Anyone can read settings" ON public.platform_settings;
CREATE POLICY "Authenticated can read settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (true);

CREATE OR REPLACE VIEW public.platform_settings_public
WITH (security_invoker = on) AS
SELECT key, value, updated_at
FROM public.platform_settings
WHERE key IN (
  'platform_name','maintenance_mode','public_announcement',
  'brand_logo_url','support_url','featured','payments'
);

GRANT SELECT ON public.platform_settings_public TO anon, authenticated;

-- 4) Storage: remove conflicting permissive SELECT on the social-proofs bucket
DROP POLICY IF EXISTS "Anyone can view social proofs" ON storage.objects;

-- 5) prestacao_products: hide whatsapp from anon browsing
CREATE OR REPLACE VIEW public.prestacao_products_public
WITH (security_invoker = on) AS
SELECT id, business_user_id, title, description, category, brand, model, year,
       total_price, min_down_payment, max_months, annual_rate, currency,
       province, city, images, stock, status, featured, views_count,
       created_at, updated_at
FROM public.prestacao_products;

GRANT SELECT ON public.prestacao_products_public TO anon, authenticated;
REVOKE SELECT ON public.prestacao_products FROM anon;

CREATE OR REPLACE FUNCTION public.get_prestacao_whatsapp(p_product_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT whatsapp
  FROM public.prestacao_products
  WHERE id = p_product_id
    AND status = 'active'
    AND auth.uid() IS NOT NULL
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.get_prestacao_whatsapp(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_prestacao_whatsapp(uuid) TO authenticated;
