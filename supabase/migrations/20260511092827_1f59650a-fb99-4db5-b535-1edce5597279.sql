CREATE TABLE public.live_ambassadors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  user_id uuid NOT NULL,
  ref_code text NOT NULL UNIQUE,
  display_name text,
  total_visits integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_user_id, user_id)
);
ALTER TABLE public.live_ambassadors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view active ambassadors"
ON public.live_ambassadors FOR SELECT TO public
USING (is_active = true OR auth.uid() = user_id OR auth.uid() = business_user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "Authenticated users can become ambassadors"
ON public.live_ambassadors FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner ambassador or business can update"
ON public.live_ambassadors FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR auth.uid() = business_user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_live_ambassadors_business ON public.live_ambassadors(business_user_id);
CREATE INDEX idx_live_ambassadors_user ON public.live_ambassadors(user_id);

CREATE TRIGGER trg_live_ambassadors_updated
BEFORE UPDATE ON public.live_ambassadors
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.live_ambassador_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ambassador_id uuid NOT NULL REFERENCES public.live_ambassadors(id) ON DELETE CASCADE,
  business_user_id uuid NOT NULL,
  live_code text NOT NULL DEFAULT '',
  visitor_hash text NOT NULL,
  user_agent text,
  referrer text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (ambassador_id, live_code, visitor_hash)
);
ALTER TABLE public.live_ambassador_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners and ambassador can view visits"
ON public.live_ambassador_visits FOR SELECT TO authenticated
USING (
  auth.uid() = business_user_id
  OR public.has_role(auth.uid(),'admin')
  OR EXISTS (SELECT 1 FROM public.live_ambassadors a WHERE a.id = ambassador_id AND a.user_id = auth.uid())
);

CREATE POLICY "Service role can insert visits"
ON public.live_ambassador_visits FOR INSERT TO public
WITH CHECK (auth.role() = 'service_role');

CREATE INDEX idx_visits_ambassador ON public.live_ambassador_visits(ambassador_id);
CREATE INDEX idx_visits_business_live ON public.live_ambassador_visits(business_user_id, live_code);

CREATE TABLE public.live_ambassador_prizes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  scope text NOT NULL DEFAULT 'live' CHECK (scope IN ('live','all_time')),
  live_code text,
  position integer NOT NULL DEFAULT 1 CHECK (position BETWEEN 1 AND 10),
  title text NOT NULL,
  description text,
  winner_user_id uuid,
  awarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.live_ambassador_prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view ambassador prizes"
ON public.live_ambassador_prizes FOR SELECT TO public
USING (true);

CREATE POLICY "Business can manage own prizes"
ON public.live_ambassador_prizes FOR ALL TO authenticated
USING (auth.uid() = business_user_id OR public.has_role(auth.uid(),'admin'))
WITH CHECK (auth.uid() = business_user_id OR public.has_role(auth.uid(),'admin'));

CREATE INDEX idx_prizes_business ON public.live_ambassador_prizes(business_user_id);

CREATE TRIGGER trg_live_ambassador_prizes_updated
BEFORE UPDATE ON public.live_ambassador_prizes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();