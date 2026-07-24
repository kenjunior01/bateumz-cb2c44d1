-- Fix: Remove anon from prestacao_products policy to prevent unauthorized access
DROP POLICY IF EXISTS "Strict product access" ON public.prestacao_products;

CREATE POLICY "Strict product access" 
  ON public.prestacao_products FOR SELECT 
  TO authenticated
  USING (
    (status = 'active') OR (public.is_superadmin(auth.uid()))
  );
