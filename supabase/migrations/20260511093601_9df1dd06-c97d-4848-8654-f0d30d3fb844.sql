
-- Public per-live ranking (security definer bypasses RLS on visits)
CREATE OR REPLACE FUNCTION public.get_live_ambassador_ranking(p_live_code text)
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
  GROUP BY a.id, a.user_id, a.display_name, a.ref_code, a.business_user_id
  ORDER BY visits DESC
  LIMIT 100;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_ambassador_ranking(text) TO anon, authenticated;

-- Auto-award prize and notify the winner
CREATE OR REPLACE FUNCTION public.award_ambassador_prize(p_prize_id uuid)
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
BEGIN
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
     SET winner_user_id = v_winner_user, awarded_at = now(), updated_at = now()
   WHERE id = p_prize_id;

  INSERT INTO public.notifications (user_id, type, title, message, metadata)
  VALUES (
    v_winner_user, 'success',
    'Ganhaste um prémio de embaixador! 🏆',
    COALESCE(v_prize.title, 'Prémio de embaixador') ||
      CASE WHEN v_prize.scope = 'live' THEN ' (Live ' || v_prize.live_code || ')' ELSE '' END,
    jsonb_build_object('prize_id', v_prize.id, 'position', v_prize.position, 'scope', v_prize.scope, 'live_code', v_prize.live_code)
  );

  RETURN jsonb_build_object('winner_user_id', v_winner_user, 'winner_name', v_winner_name, 'awarded_at', now());
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_ambassador_prize(uuid) TO authenticated;

-- Realtime for notifications (idempotent)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
