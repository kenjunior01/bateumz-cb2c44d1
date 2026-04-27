
CREATE TABLE public.prestacao_products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  title text NOT NULL,
  category text NOT NULL DEFAULT 'outros',
  description text,
  total_price numeric NOT NULL DEFAULT 0,
  min_down_payment numeric NOT NULL DEFAULT 0,
  max_months integer NOT NULL DEFAULT 12,
  annual_rate numeric NOT NULL DEFAULT 0.15,
  images jsonb NOT NULL DEFAULT '[]'::jsonb,
  province text,
  city text,
  whatsapp text NOT NULL,
  brand text,
  model text,
  year integer,
  stock integer NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'active',
  featured boolean NOT NULL DEFAULT false,
  views_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prestacao_products_status ON public.prestacao_products(status);
CREATE INDEX idx_prestacao_products_category ON public.prestacao_products(category);
CREATE INDEX idx_prestacao_products_business ON public.prestacao_products(business_user_id);

ALTER TABLE public.prestacao_products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active products"
  ON public.prestacao_products FOR SELECT
  USING (status = 'active' OR auth.uid() = business_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business users can insert own products"
  ON public.prestacao_products FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = business_user_id AND has_role(auth.uid(), 'business'::app_role));

CREATE POLICY "Business users can update own products"
  ON public.prestacao_products FOR UPDATE
  TO authenticated
  USING (auth.uid() = business_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Business users can delete own products"
  ON public.prestacao_products FOR DELETE
  TO authenticated
  USING (auth.uid() = business_user_id OR has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prestacao_products_updated_at
  BEFORE UPDATE ON public.prestacao_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
