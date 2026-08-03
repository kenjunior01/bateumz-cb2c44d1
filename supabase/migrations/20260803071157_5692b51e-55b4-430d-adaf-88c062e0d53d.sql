-- 1) game_sessions: remove public read
DROP POLICY IF EXISTS "sessions_select_public" ON public.game_sessions;
DROP POLICY IF EXISTS "sessions_select_own" ON public.game_sessions;
CREATE POLICY "sessions_select_own" ON public.game_sessions
FOR SELECT TO authenticated
USING (business_user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- 2) live_ambassador_prizes: hide winner identity from the public
DROP POLICY IF EXISTS "Anyone can view ambassador prizes" ON public.live_ambassador_prizes;
CREATE POLICY "Involved users can view ambassador prizes" ON public.live_ambassador_prizes
FOR SELECT TO authenticated
USING (
  auth.uid() = business_user_id
  OR auth.uid() = winner_user_id
  OR public.has_role(auth.uid(), 'admin')
  OR public.is_superadmin(auth.uid())
);

CREATE OR REPLACE VIEW public.live_ambassador_prizes_public
WITH (security_invoker=off) AS
SELECT id, business_user_id, scope, live_code, scheduled_live_id, position, title, description,
       (winner_user_id IS NOT NULL) AS is_awarded, awarded_at, created_at
FROM public.live_ambassador_prizes;
GRANT SELECT ON public.live_ambassador_prizes_public TO anon, authenticated;

-- 3) payment-receipts: scope business access to the raffle owner
DROP POLICY IF EXISTS "Business and admin can view receipts" ON storage.objects;
CREATE POLICY "Buyer, owning business and admin can view receipts" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-receipts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_superadmin(auth.uid())
    OR EXISTS (
      SELECT 1
      FROM public.participants p
      JOIN public.raffles r ON r.id = p.raffle_id
      WHERE r.business_user_id = auth.uid()
        AND p.receipt_url LIKE '%' || name
    )
  )
);

-- 4) game-images: ownership-scoped writes
DROP POLICY IF EXISTS "Allow authenticated uploads to game-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated updates to game-images" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated deletes to game-images" ON storage.objects;

CREATE POLICY "Users upload own game images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'game-images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_superadmin(auth.uid())
  )
);

CREATE POLICY "Users update own game images" ON storage.objects
FOR UPDATE TO authenticated
USING (
  bucket_id = 'game-images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_superadmin(auth.uid())
  )
);

CREATE POLICY "Users delete own game images" ON storage.objects
FOR DELETE TO authenticated
USING (
  bucket_id = 'game-images'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_superadmin(auth.uid())
  )
);

-- 5) world_cup_predictions: signed-in users only
DROP POLICY IF EXISTS "User predictions" ON public.world_cup_predictions;
CREATE POLICY "User predictions" ON public.world_cup_predictions
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6) always-true write policies tightened
DROP POLICY IF EXISTS "blog_likes_insert" ON public.blog_likes;
CREATE POLICY "blog_likes_insert" ON public.blog_likes
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
DROP POLICY IF EXISTS "blog_likes_delete" ON public.blog_likes;
CREATE POLICY "blog_likes_delete" ON public.blog_likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role can manage email logs" ON public.email_send_log;
CREATE POLICY "Service role can manage email logs" ON public.email_send_log
FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage tokens" ON public.email_unsubscribe_tokens;
CREATE POLICY "Service role can manage tokens" ON public.email_unsubscribe_tokens
FOR ALL TO service_role USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Service role can manage suppressed emails" ON public.suppressed_emails;
CREATE POLICY "Service role can manage suppressed emails" ON public.suppressed_emails
FOR ALL TO service_role USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can subscribe" ON public.newsletter_signups;
CREATE POLICY "Anyone can subscribe" ON public.newsletter_signups
FOR INSERT TO anon, authenticated
WITH CHECK (email IS NOT NULL AND length(email) BETWEEN 5 AND 255 AND email LIKE '%@%.%');

-- 7) mutable search_path
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.update_updated_at() SET search_path = public;
ALTER FUNCTION public.update_blog_trending() SET search_path = public;
ALTER FUNCTION public.refresh_daily_analytics(uuid, date) SET search_path = public;
ALTER FUNCTION public.increment_blog_view(text) SET search_path = public;
ALTER FUNCTION public.toggle_blog_like(text, uuid) SET search_path = public;

-- 8) privileged SECURITY DEFINER functions must not be callable from the API
REVOKE ALL ON FUNCTION public.email_queue_dispatch() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.enqueue_email(text, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_email(text, bigint) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.read_email_batch(text, integer, integer) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.refresh_daily_analytics(uuid, date) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.is_superadmin(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE ALL ON FUNCTION public.admin_country(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.can_admin_country(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.award_ambassador_prize(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.award_ambassador_prize(uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.get_prestacao_whatsapp(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.get_live_studio_summary(uuid) FROM anon;