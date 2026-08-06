GRANT EXECUTE ON FUNCTION public.can_admin_country(uuid, text) TO anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon;
GRANT EXECUTE ON FUNCTION public.is_superadmin(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.admin_country(uuid) TO anon;