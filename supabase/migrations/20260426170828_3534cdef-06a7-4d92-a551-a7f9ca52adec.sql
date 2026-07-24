-- Table to capture interest leads for the upcoming "Vendas a Prestações" feature
CREATE TABLE public.prestacao_leads (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  product_type TEXT NOT NULL,
  estimated_value NUMERIC,
  down_payment NUMERIC,
  desired_months INTEGER,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.prestacao_leads ENABLE ROW LEVEL SECURITY;

-- Anyone (anon or authenticated) can submit an interest form
CREATE POLICY "Anyone can submit prestacao leads"
ON public.prestacao_leads
FOR INSERT
TO anon, authenticated
WITH CHECK (true);

-- Only admins can read, update or delete leads
CREATE POLICY "Admins can view prestacao leads"
ON public.prestacao_leads
FOR SELECT
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update prestacao leads"
ON public.prestacao_leads
FOR UPDATE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can delete prestacao leads"
ON public.prestacao_leads
FOR DELETE
TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_prestacao_leads_updated_at
BEFORE UPDATE ON public.prestacao_leads
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_prestacao_leads_created_at ON public.prestacao_leads(created_at DESC);
CREATE INDEX idx_prestacao_leads_status ON public.prestacao_leads(status);