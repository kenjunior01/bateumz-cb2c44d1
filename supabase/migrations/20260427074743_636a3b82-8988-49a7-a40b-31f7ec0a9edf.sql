CREATE TABLE public.prestacao_product_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.prestacao_products(id) ON DELETE CASCADE,
  business_user_id UUID NOT NULL,
  visitor_user_id UUID,
  visitor_name TEXT,
  visitor_whatsapp TEXT,
  total_price NUMERIC NOT NULL DEFAULT 0,
  down_payment NUMERIC NOT NULL DEFAULT 0,
  months INTEGER NOT NULL DEFAULT 12,
  monthly_estimate NUMERIC NOT NULL DEFAULT 0,
  source TEXT NOT NULL DEFAULT 'product',
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_prestacao_product_leads_product ON public.prestacao_product_leads(product_id);
CREATE INDEX idx_prestacao_product_leads_business ON public.prestacao_product_leads(business_user_id);
CREATE INDEX idx_prestacao_product_leads_created ON public.prestacao_product_leads(created_at DESC);

ALTER TABLE public.prestacao_product_leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit product leads"
ON public.prestacao_product_leads
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Admins and product owners can view leads"
ON public.prestacao_product_leads
FOR SELECT TO authenticated
USING (has_role(auth.uid(),'admin'::app_role) OR business_user_id = auth.uid());

CREATE POLICY "Admins can update leads"
ON public.prestacao_product_leads
FOR UPDATE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role))
WITH CHECK (has_role(auth.uid(),'admin'::app_role));

CREATE POLICY "Admins can delete leads"
ON public.prestacao_product_leads
FOR DELETE TO authenticated
USING (has_role(auth.uid(),'admin'::app_role));

CREATE OR REPLACE FUNCTION public.increment_prestacao_product_views(_product_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.prestacao_products
  SET views_count = COALESCE(views_count, 0) + 1
  WHERE id = _product_id AND status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_prestacao_product_views(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.validate_prestacao_product()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.total_price <= 0 THEN
    RAISE EXCEPTION 'O preco total tem de ser maior que zero';
  END IF;
  IF NEW.min_down_payment < 0 OR NEW.min_down_payment >= NEW.total_price THEN
    RAISE EXCEPTION 'A entrada minima tem de estar entre 0 e o preco total';
  END IF;
  IF NEW.max_months < 1 OR NEW.max_months > 120 THEN
    RAISE EXCEPTION 'O prazo maximo tem de estar entre 1 e 120 meses';
  END IF;
  IF NEW.annual_rate < 0 OR NEW.annual_rate > 1 THEN
    RAISE EXCEPTION 'A taxa anual tem de estar entre 0 e 1 (por exemplo 0.15)';
  END IF;
  IF NEW.stock < 0 THEN
    RAISE EXCEPTION 'O stock nao pode ser negativo';
  END IF;
  IF NEW.status NOT IN ('active','draft','sold_out','archived') THEN
    RAISE EXCEPTION 'Estado invalido (use active, draft, sold_out ou archived)';
  END IF;
  IF length(coalesce(NEW.whatsapp,'')) < 8 THEN
    RAISE EXCEPTION 'O WhatsApp do vendedor e obrigatorio';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS prestacao_products_validate ON public.prestacao_products;
CREATE TRIGGER prestacao_products_validate
BEFORE INSERT OR UPDATE ON public.prestacao_products
FOR EACH ROW EXECUTE FUNCTION public.validate_prestacao_product();

DROP TRIGGER IF EXISTS prestacao_products_updated_at ON public.prestacao_products;
CREATE TRIGGER prestacao_products_updated_at
BEFORE UPDATE ON public.prestacao_products
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();