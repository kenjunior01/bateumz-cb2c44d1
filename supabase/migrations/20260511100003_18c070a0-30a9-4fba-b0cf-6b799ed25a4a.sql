
-- 1. scheduled_lives
CREATE TABLE public.scheduled_lives (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_user_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  cover_url text,
  source_type text NOT NULL DEFAULT 'external' CHECK (source_type IN ('internal','external')),
  live_code text,
  external_url text,
  external_platform text CHECK (external_platform IS NULL OR external_platform IN ('youtube','instagram','tiktok','facebook','other')),
  scheduled_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL DEFAULT 'scheduled' CHECK (status IN ('draft','scheduled','live','ended','cancelled')),
  slug text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_scheduled_lives_biz ON public.scheduled_lives(business_user_id);
CREATE INDEX idx_scheduled_lives_status_time ON public.scheduled_lives(status, scheduled_at);

ALTER TABLE public.scheduled_lives ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view visible scheduled lives"
  ON public.scheduled_lives FOR SELECT
  USING (status IN ('scheduled','live','ended') OR auth.uid() = business_user_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Business can insert own scheduled lives"
  ON public.scheduled_lives FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = business_user_id);

CREATE POLICY "Business can update own scheduled lives"
  ON public.scheduled_lives FOR UPDATE TO authenticated
  USING (auth.uid() = business_user_id OR has_role(auth.uid(),'admin'));

CREATE POLICY "Business can delete own scheduled lives"
  ON public.scheduled_lives FOR DELETE TO authenticated
  USING (auth.uid() = business_user_id OR has_role(auth.uid(),'admin'));

CREATE TRIGGER scheduled_lives_updated_at
  BEFORE UPDATE ON public.scheduled_lives
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. extend visits
ALTER TABLE public.live_ambassador_visits
  ADD COLUMN scheduled_live_id uuid,
  ADD COLUMN attended_at timestamptz;

CREATE INDEX idx_visits_scheduled_live ON public.live_ambassador_visits(scheduled_live_id) WHERE scheduled_live_id IS NOT NULL;
CREATE INDEX idx_visits_attended ON public.live_ambassador_visits(scheduled_live_id, attended_at) WHERE attended_at IS NOT NULL;

-- 3. extend prizes
ALTER TABLE public.live_ambassador_prizes
  ADD COLUMN scheduled_live_id uuid;

CREATE INDEX idx_prizes_scheduled_live ON public.live_ambassador_prizes(scheduled_live_id) WHERE scheduled_live_id IS NOT NULL;

-- 4. ranking RPC
CREATE OR REPLACE FUNCTION public.get_scheduled_live_ranking(
  p_scheduled_live_id uuid,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE(
  ambassador_id uuid,
  user_id uuid,
  display_name text,
  ref_code text,
  visits bigint
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT a.id, a.user_id, a.display_name, a.ref_code,
         COUNT(v.id) AS visits
  FROM public.live_ambassador_visits v
  JOIN public.live_ambassadors a ON a.id = v.ambassador_id
  WHERE v.scheduled_live_id = p_scheduled_live_id
    AND v.attended_at IS NOT NULL
  GROUP BY a.id, a.user_id, a.display_name, a.ref_code
  ORDER BY visits DESC, a.id
  LIMIT GREATEST(LEAST(COALESCE(p_limit,50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_scheduled_live_ranking(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scheduled_live_ranking(uuid,integer,integer) TO anon, authenticated;

-- 5. attendance confirmation RPC (validates time window)
CREATE OR REPLACE FUNCTION public.confirm_live_attendance(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visit public.live_ambassador_visits%ROWTYPE;
  v_live public.scheduled_lives%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.live_ambassador_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'visit_not_found'); END IF;
  IF v_visit.attended_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  IF v_visit.scheduled_live_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_live'); END IF;

  SELECT * INTO v_live FROM public.scheduled_lives WHERE id = v_visit.scheduled_live_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'live_not_found'); END IF;

  IF now() < v_live.scheduled_at - interval '30 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_early');
  END IF;
  IF v_live.ends_at IS NOT NULL AND now() > v_live.ends_at + interval '2 hours' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
  END IF;

  UPDATE public.live_ambassador_visits SET attended_at = now() WHERE id = p_visit_id;
  RETURN jsonb_build_object('ok', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_live_attendance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_live_attendance(uuid) TO anon, authenticated;
