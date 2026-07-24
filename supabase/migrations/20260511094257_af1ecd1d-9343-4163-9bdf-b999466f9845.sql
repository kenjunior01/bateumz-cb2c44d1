
-- Audit columns on prizes
ALTER TABLE public.live_ambassador_prizes
  ADD COLUMN IF NOT EXISTS award_mode text,
  ADD COLUMN IF NOT EXISTS notified_at timestamptz;

ALTER TABLE public.live_ambassador_prizes
  DROP CONSTRAINT IF EXISTS live_ambassador_prizes_award_mode_check;
ALTER TABLE public.live_ambassador_prizes
  ADD CONSTRAINT live_ambassador_prizes_award_mode_check
  CHECK (award_mode IS NULL OR award_mode IN ('auto','manual'));

-- Recreate the public ranking function with pagination + optional business filter
DROP FUNCTION IF EXISTS public.get_live_ambassador_ranking(text);
DROP FUNCTION IF EXISTS public.get_live_ambassador_ranking(text, integer, integer, uuid);

CREATE FUNCTION public.get_live_ambassador_ranking(
  p_live_code text,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0,
  p_business_user_id uuid DEFAULT NULL
)
RETURNS TABLE(
  ambassador_id uuid,
  user_id uuid,
  display_name text,
  ref_code text,
  business_user_id uuid,
  visits bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT a.id, a.user_id, a.display_name, a.ref_code, a.business_user_id,
         COUNT(v.id) AS visits
  FROM public.live_ambassador_visits v
  JOIN public.live_ambassadors a ON a.id = v.ambassador_id
  WHERE v.live_code = p_live_code
    AND (p_business_user_id IS NULL OR v.business_user_id = p_business_user_id)
  GROUP BY a.id, a.user_id, a.display_name, a.ref_code, a.business_user_id
  ORDER BY visits DESC, a.id
  LIMIT GREATEST(LEAST(COALESCE(p_limit, 50), 200), 1)
  OFFSET GREATEST(COALESCE(p_offset, 0), 0);
$$;

REVOKE ALL ON FUNCTION public.get_live_ambassador_ranking(text, integer, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_live_ambassador_ranking(text, integer, integer, uuid) TO anon, authenticated;

-- Update award function to record mode and notification timestamp
CREATE OR REPLACE FUNCTION public.award_ambassador_prize(p_prize_id uuid, p_mode text DEFAULT 'manual')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prize public.live_ambassador_prizes%ROWTYPE;
  v_winner_user uuid;
  v_winner_name text;
  v_caller uuid := auth.uid();
  v_mode text := COALESCE(p_mode, 'manual');
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'Auth required'; END IF;
  IF v_mode NOT IN ('auto','manual') THEN v_mode := 'manual'; END IF;

  SELECT * INTO v_prize FROM public.live_ambassador_prizes WHERE id = p_prize_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Prize not found'; END IF;
  IF v_prize.business_user_id <> v_caller AND NOT public.has_role(v_caller, 'admin') THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;
  IF v_prize.winner_user_id IS NOT NULL THEN
    RETURN jsonb_build_object('already_awarded', true, 'winner_user_id', v_prize.winner_user_id);
  END IF;

  IF v_prize.scope = 'live' AND v_prize.live_code IS NOT NULL THEN
    SELECT a.user_id, a.display_name INTO v_winner_user, v_winner_name
    FROM public.live_ambassador_visits v
    JOIN public.live_ambassadors a ON a.id = v.ambassador_id
    WHERE v.business_user_id = v_prize.business_user_id AND v.live_code = v_prize.live_code
    GROUP BY a.user_id, a.display_name
    ORDER BY COUNT(v.id) DESC
    OFFSET (v_prize.position - 1) LIMIT 1;
  ELSE
    SELECT a.user_id, a.display_name INTO v_winner_user, v_winner_name
    FROM public.live_ambassadors a
    WHERE a.business_user_id = v_prize.business_user_id
    ORDER BY a.total_visits DESC
    OFFSET (v_prize.position - 1) LIMIT 1;
  END IF;

  IF v_winner_user IS NULL THEN
    RETURN jsonb_build_object('no_winner', true);
  END IF;

  UPDATE public.live_ambassador_prizes
     SET winner_user_id = v_winner_user,
         awarded_at = now(),
         award_mode = v_mode,
         notified_at = now(),
         updated_at = now()
   WHERE id = p_prize_id;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_winner_user, 'success',
    'Ganhaste um prémio de embaixador! 🏆',
    COALESCE(v_prize.title, 'Prémio de embaixador') ||
      CASE WHEN v_prize.scope = 'live' THEN ' (Live ' || v_prize.live_code || ')' ELSE '' END,
    jsonb_build_object('prize_id', v_prize.id, 'position', v_prize.position, 'scope', v_prize.scope, 'live_code', v_prize.live_code, 'mode', v_mode)
  );

  RETURN jsonb_build_object(
    'winner_user_id', v_winner_user,
    'winner_name', v_winner_name,
    'awarded_at', now(),
    'mode', v_mode
  );
END;
$$;

REVOKE ALL ON FUNCTION public.award_ambassador_prize(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_ambassador_prize(uuid, text) TO authenticated;
