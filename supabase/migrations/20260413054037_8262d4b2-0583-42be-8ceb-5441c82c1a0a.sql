
-- 1. Add new raffle columns
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS max_winners integer NOT NULL DEFAULT 1;
ALTER TABLE public.raffles ADD COLUMN IF NOT EXISTS max_tickets_per_user integer;

-- 2. Fix white_label_configs: create public view without payment data
CREATE OR REPLACE VIEW public.white_label_configs_public
WITH (security_invoker = on) AS
SELECT id, business_user_id, brand_name, logo_url, primary_color, secondary_color, custom_domain, description, is_active, created_at, updated_at
FROM public.white_label_configs;

-- Restrict public SELECT to owners/admins only (remove public readable policy)
DROP POLICY IF EXISTS "Public can view active config branding" ON public.white_label_configs;

CREATE POLICY "Owners and admins can view configs"
ON public.white_label_configs FOR SELECT
USING (auth.uid() = business_user_id OR public.has_role(auth.uid(), 'admin'));

-- 3. Fix audit_logs INSERT - restrict to admins only
DROP POLICY IF EXISTS "Authenticated users can insert audit logs" ON public.audit_logs;

CREATE POLICY "Admins can insert audit logs"
ON public.audit_logs FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- 4. Fix social-proofs storage upload ownership
DROP POLICY IF EXISTS "Authenticated users can upload social proofs" ON storage.objects;

CREATE POLICY "Users can upload to own social-proofs folder"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'social-proofs' AND (auth.uid())::text = (storage.foldername(name))[1]);
