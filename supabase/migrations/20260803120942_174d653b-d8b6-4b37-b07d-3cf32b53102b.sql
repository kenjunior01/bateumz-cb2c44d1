CREATE TABLE public.password_reset_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text,
  stage text NOT NULL,
  reason text,
  link_type text,
  error_message text,
  user_agent text,
  ip_hint text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.password_reset_events TO authenticated;
GRANT ALL ON public.password_reset_events TO service_role;

ALTER TABLE public.password_reset_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view password reset events"
ON public.password_reset_events
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

CREATE INDEX idx_password_reset_events_created_at ON public.password_reset_events (created_at DESC);
CREATE INDEX idx_password_reset_events_email ON public.password_reset_events (email);