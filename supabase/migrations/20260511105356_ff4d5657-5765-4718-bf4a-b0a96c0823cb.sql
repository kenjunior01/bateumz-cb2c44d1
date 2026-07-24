
-- ===== scheduled_live_links =====
CREATE TABLE public.scheduled_live_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id uuid NOT NULL REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  platform text NOT NULL,
  url text NOT NULL,
  label text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_scheduled_live_links_live ON public.scheduled_live_links(scheduled_live_id);
ALTER TABLE public.scheduled_live_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view live links" ON public.scheduled_live_links
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage live links" ON public.scheduled_live_links
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = scheduled_live_links.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = scheduled_live_links.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- ===== live_polls =====
CREATE TABLE public.live_polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id uuid NOT NULL REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  question text NOT NULL,
  options jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_open boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz
);
CREATE INDEX idx_live_polls_live ON public.live_polls(scheduled_live_id);
ALTER TABLE public.live_polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view polls" ON public.live_polls
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage polls" ON public.live_polls
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_polls.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_polls.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- ===== live_poll_votes =====
CREATE TABLE public.live_poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.live_polls(id) ON DELETE CASCADE,
  voter_hash text NOT NULL,
  option_index integer NOT NULL,
  user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, voter_hash)
);
CREATE INDEX idx_live_poll_votes_poll ON public.live_poll_votes(poll_id);
ALTER TABLE public.live_poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view poll votes" ON public.live_poll_votes
  FOR SELECT USING (true);

-- inserts only via RPC (no direct insert)

-- ===== live_announcements =====
CREATE TABLE public.live_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id uuid NOT NULL REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  message text NOT NULL,
  kind text NOT NULL DEFAULT 'info',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_live_announcements_live ON public.live_announcements(scheduled_live_id, created_at DESC);
ALTER TABLE public.live_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view announcements" ON public.live_announcements
  FOR SELECT USING (true);

CREATE POLICY "Owner can manage announcements" ON public.live_announcements
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_announcements.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_announcements.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- ===== live_studio_checklist =====
CREATE TABLE public.live_studio_checklist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheduled_live_id uuid NOT NULL REFERENCES public.scheduled_lives(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  done boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(scheduled_live_id, item_key)
);
ALTER TABLE public.live_studio_checklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner can view checklist" ON public.live_studio_checklist
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_studio_checklist.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

CREATE POLICY "Owner can manage checklist" ON public.live_studio_checklist
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_studio_checklist.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))))
  WITH CHECK (EXISTS (SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = live_studio_checklist.scheduled_live_id AND (sl.business_user_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role))));

-- ===== community_messages.scheduled_live_id =====
ALTER TABLE public.community_messages
  ADD COLUMN IF NOT EXISTS scheduled_live_id uuid REFERENCES public.scheduled_lives(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_community_messages_live ON public.community_messages(scheduled_live_id);

-- Allow owner to delete community messages tagged to their live
CREATE POLICY "Live owner can delete live chat messages" ON public.community_messages
  FOR DELETE TO authenticated
  USING (scheduled_live_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.scheduled_lives sl WHERE sl.id = community_messages.scheduled_live_id AND sl.business_user_id = auth.uid()
  ));

-- ===== RPC: cast_live_poll_vote =====
CREATE OR REPLACE FUNCTION public.cast_live_poll_vote(p_poll_id uuid, p_voter_hash text, p_option_index integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_poll public.live_polls%ROWTYPE;
  v_inserted boolean := false;
BEGIN
  SELECT * INTO v_poll FROM public.live_polls WHERE id = p_poll_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'reason', 'poll_not_found'); END IF;
  IF NOT v_poll.is_open THEN RETURN jsonb_build_object('ok', false, 'reason', 'closed'); END IF;
  IF p_option_index < 0 OR p_option_index >= jsonb_array_length(v_poll.options) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'bad_option');
  END IF;

  INSERT INTO public.live_poll_votes (poll_id, voter_hash, option_index, user_id)
  VALUES (p_poll_id, p_voter_hash, p_option_index, auth.uid())
  ON CONFLICT (poll_id, voter_hash) DO NOTHING;
  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  IF NOT v_inserted THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  RETURN jsonb_build_object('ok', true, 'counted', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cast_live_poll_vote(uuid, text, integer) TO anon, authenticated;

-- ===== RPC: get_live_studio_summary =====
CREATE OR REPLACE FUNCTION public.get_live_studio_summary(p_scheduled_live_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_visits_total bigint;
  v_attendance_total bigint;
  v_polls_count bigint;
  v_announcements_count bigint;
  v_prizes_total bigint;
  v_prizes_awarded bigint;
BEGIN
  SELECT count(*) INTO v_visits_total FROM public.live_ambassador_visits WHERE scheduled_live_id = p_scheduled_live_id;
  SELECT count(*) INTO v_attendance_total FROM public.scheduled_live_attendance WHERE scheduled_live_id = p_scheduled_live_id;
  SELECT count(*) INTO v_polls_count FROM public.live_polls WHERE scheduled_live_id = p_scheduled_live_id;
  SELECT count(*) INTO v_announcements_count FROM public.live_announcements WHERE scheduled_live_id = p_scheduled_live_id;
  SELECT count(*), count(*) FILTER (WHERE winner_user_id IS NOT NULL)
    INTO v_prizes_total, v_prizes_awarded
    FROM public.live_ambassador_prizes WHERE scheduled_live_id = p_scheduled_live_id;
  RETURN jsonb_build_object(
    'visits_total', v_visits_total,
    'attendance_total', v_attendance_total,
    'polls_count', v_polls_count,
    'announcements_count', v_announcements_count,
    'prizes_total', v_prizes_total,
    'prizes_awarded', v_prizes_awarded
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_live_studio_summary(uuid) TO anon, authenticated;

-- ===== Realtime =====
ALTER TABLE public.live_polls REPLICA IDENTITY FULL;
ALTER TABLE public.live_poll_votes REPLICA IDENTITY FULL;
ALTER TABLE public.live_announcements REPLICA IDENTITY FULL;
ALTER TABLE public.scheduled_live_links REPLICA IDENTITY FULL;
ALTER TABLE public.live_studio_checklist REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.live_polls;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_poll_votes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_announcements;
ALTER PUBLICATION supabase_realtime ADD TABLE public.scheduled_live_links;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_studio_checklist;
