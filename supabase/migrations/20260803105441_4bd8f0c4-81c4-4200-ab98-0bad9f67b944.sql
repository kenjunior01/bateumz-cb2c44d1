-- 1) platform_settings: remove blanket authenticated read
DROP POLICY IF EXISTS "Authenticated can read settings" ON public.platform_settings;

CREATE POLICY "Admins can read settings"
  ON public.platform_settings
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_superadmin(auth.uid()));

-- Expose announcements through the allowlisted public view instead
CREATE OR REPLACE VIEW public.platform_settings_public
WITH (security_invoker = off) AS
SELECT key, value, updated_at
FROM public.platform_settings
WHERE key = ANY (ARRAY[
  'platform_name','maintenance_mode','public_announcement','brand_logo_url',
  'support_url','featured','payments','announcements'
]);

GRANT SELECT ON public.platform_settings_public TO anon, authenticated;

-- 2) social-proofs: drop public read policies (ownership policies already exist)
DROP POLICY IF EXISTS "Anyone can view social proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public read social proofs" ON storage.objects;

-- 3) Remove PUBLIC/anon EXECUTE on SECURITY DEFINER functions that don't need it
REVOKE ALL ON FUNCTION public.get_trending_posts(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.increment_blog_view(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.toggle_blog_like(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_trending_posts(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_blog_view(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.toggle_blog_like(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.award_ambassador_prize(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.award_ambassador_prize(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_live_studio_summary(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_prestacao_whatsapp(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_country(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.can_admin_country(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_superadmin(uuid) FROM anon;