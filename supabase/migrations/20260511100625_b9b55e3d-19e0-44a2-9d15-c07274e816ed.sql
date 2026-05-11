
-- 1. Unique constraint to prevent duplicate visit rows per (device, ambassador, scheduled live)
CREATE UNIQUE INDEX IF NOT EXISTS uq_visits_device_amb_live
  ON public.live_ambassador_visits (visitor_hash, ambassador_id, scheduled_live_id)
  WHERE scheduled_live_id IS NOT NULL;

-- 2. Attendance ledger: at most 1 attendance per device per scheduled live, regardless of ambassador
CREATE TABLE public.scheduled_live_attendance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id uuid NOT NULL REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  visitor_hash text NOT NULL,
  ambassador_id uuid NOT NULL,
  user_id uuid,
  confirmed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (scheduled_live_id, visitor_hash)
);
CREATE INDEX idx_attendance_amb ON public.scheduled_live_attendance(ambassador_id);

ALTER TABLE public.scheduled_live_attendance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Business owners and admin can view attendance"
  ON public.scheduled_live_attendance FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'admin')
    OR EXISTS (
      SELECT 1 FROM public.scheduled_lives sl
      WHERE sl.id = scheduled_live_attendance.scheduled_live_id
        AND sl.business_user_id = auth.uid()
    )
  );

-- 3. Replace confirm_live_attendance with anti-fraud rules
CREATE OR REPLACE FUNCTION public.confirm_live_attendance(p_visit_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_visit public.live_ambassador_visits%ROWTYPE;
  v_live public.scheduled_lives%ROWTYPE;
  v_amb public.live_ambassadors%ROWTYPE;
  v_inserted boolean := false;
BEGIN
  SELECT * INTO v_visit FROM public.live_ambassador_visits WHERE id = p_visit_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'visit_not_found'); END IF;
  IF v_visit.scheduled_live_id IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'no_live'); END IF;

  SELECT * INTO v_live FROM public.scheduled_lives WHERE id = v_visit.scheduled_live_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'live_not_found'); END IF;
  IF v_live.status = 'cancelled' THEN RETURN jsonb_build_object('ok', false, 'reason', 'cancelled'); END IF;

  -- Time window: 30 min before scheduled start, until ends_at + 2h (or 6h after start if no end)
  IF now() < v_live.scheduled_at - interval '30 minutes' THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'too_early');
  END IF;
  IF v_live.ends_at IS NOT NULL THEN
    IF now() > v_live.ends_at + interval '2 hours' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
    END IF;
  ELSE
    IF now() > v_live.scheduled_at + interval '6 hours' THEN
      RETURN jsonb_build_object('ok', false, 'reason', 'too_late');
    END IF;
  END IF;

  -- Anti self-referral: the logged-in user can't validate their own ambassador link
  SELECT * INTO v_amb FROM public.live_ambassadors WHERE id = v_visit.ambassador_id;
  IF auth.uid() IS NOT NULL AND v_amb.user_id = auth.uid() THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'self_referral');
  END IF;

  -- Ledger insert: ON CONFLICT DO NOTHING means same device already counted for this live
  INSERT INTO public.scheduled_live_attendance (scheduled_live_id, visitor_hash, ambassador_id, user_id)
  VALUES (v_live.id, v_visit.visitor_hash, v_visit.ambassador_id, auth.uid())
  ON CONFLICT (scheduled_live_id, visitor_hash) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN
    -- Already counted for someone else (or this same ambassador) — don't double count
    RETURN jsonb_build_object('ok', true, 'already', true);
  END IF;

  -- Mark this visit as attended (the one whose ambassador wins the credit)
  UPDATE public.live_ambassador_visits
     SET attended_at = now()
   WHERE id = p_visit_id AND attended_at IS NULL;

  RETURN jsonb_build_object('ok', true, 'counted', true);
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_live_attendance(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_live_attendance(uuid) TO anon, authenticated;

-- 4. Update ranking RPC to count from the attendance ledger (canonical source of truth)
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
         COUNT(att.id) AS visits
  FROM public.scheduled_live_attendance att
  JOIN public.live_ambassadors a ON a.id = att.ambassador_id
  WHERE att.scheduled_live_id = p_scheduled_live_id
  GROUP BY a.id, a.user_id, a.display_name, a.ref_code
  ORDER BY visits DESC, a.id
  LIMIT GREATEST(LEAST(COALESCE(p_limit,50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset,0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_scheduled_live_ranking(uuid,integer,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_scheduled_live_ranking(uuid,integer,integer) TO anon, authenticated;
