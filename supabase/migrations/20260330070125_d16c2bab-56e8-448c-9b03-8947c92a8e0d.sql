
CREATE TABLE IF NOT EXISTS public.platform_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings" ON public.platform_settings
  FOR SELECT TO public USING (true);

CREATE POLICY "Admins can manage settings" ON public.platform_settings
  FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Insert default settings
INSERT INTO public.platform_settings (key, value) VALUES
  ('general', '{"platformName": "Bateu", "platformTagline": "Sorteios que inspiram", "supportEmail": "suporte@bateu.co.mz", "whatsappNumber": "258840000000"}'::jsonb),
  ('business', '{"maxTicketsPerUser": 10, "commissionRate": 5, "autoApprovePayments": false}'::jsonb),
  ('maintenance', '{"enabled": false}'::jsonb),
  ('featured', '{"raffleId": ""}'::jsonb)
ON CONFLICT (key) DO NOTHING;
