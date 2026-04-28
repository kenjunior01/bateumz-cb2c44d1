-- Unify lead tracking: prestacao_product_leads becomes the single table for all installment-sale leads
-- Allow leads without a specific product (general waitlist from /prestacoes)
ALTER TABLE public.prestacao_product_leads
  ALTER COLUMN product_id DROP NOT NULL,
  ALTER COLUMN business_user_id DROP NOT NULL;

-- Add fields needed for general leads
ALTER TABLE public.prestacao_product_leads
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS notes text,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';

-- Update SELECT policy so admins keep seeing all leads, owners see their product leads,
-- and general leads (no business_user_id) are visible only to admins
DROP POLICY IF EXISTS "Admins and product owners can view leads" ON public.prestacao_product_leads;
CREATE POLICY "Admins and product owners can view leads"
ON public.prestacao_product_leads
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR (business_user_id IS NOT NULL AND business_user_id = auth.uid())
);

-- Drop legacy table (data is empty / superseded)
DROP TABLE IF EXISTS public.prestacao_leads CASCADE;
