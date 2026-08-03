-- Public buckets: files remain publicly reachable by URL, but bucket listing via the API is disabled
DROP POLICY IF EXISTS "Anyone can view contest media" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view raffle images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view status images" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view white label logos" ON storage.objects;
DROP POLICY IF EXISTS "Public view for game-images" ON storage.objects;
DROP POLICY IF EXISTS "Regional assets are publicly readable" ON storage.objects;

CREATE POLICY "Owners and admins can list own media" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id IN ('contest-media','raffle-images','user-stories','white-label-logos','game-images','regional-assets')
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_superadmin(auth.uid())
  )
);

-- toggle_blog_like must act on the caller, not a client-supplied user id
DROP FUNCTION IF EXISTS public.toggle_blog_like(text, uuid);
CREATE OR REPLACE FUNCTION public.toggle_blog_like(post_slug text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  already_liked boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  SELECT EXISTS(SELECT 1 FROM public.blog_likes bl WHERE bl.post_slug = toggle_blog_like.post_slug AND bl.user_id = v_user) INTO already_liked;
  IF already_liked THEN
    DELETE FROM public.blog_likes bl WHERE bl.post_slug = toggle_blog_like.post_slug AND bl.user_id = v_user;
    UPDATE public.blog_posts SET like_count = GREATEST(COALESCE(like_count, 0) - 1, 0) WHERE slug = toggle_blog_like.post_slug;
    RETURN false;
  ELSE
    INSERT INTO public.blog_likes (post_slug, user_id) VALUES (toggle_blog_like.post_slug, v_user);
    UPDATE public.blog_posts SET like_count = COALESCE(like_count, 0) + 1 WHERE slug = toggle_blog_like.post_slug;
    RETURN true;
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.toggle_blog_like(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.toggle_blog_like(text) TO authenticated;

-- Internal-only functions should not be exposed through the API
REVOKE ALL ON FUNCTION public.handle_new_user() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_contest_vote() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.generate_referral_code() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.email_queue_wake() FROM anon, authenticated;