-- ============================================================
-- Regional Manager Role - Complete RBAC Migration
-- Adds regional_manager to app_role enum, updates RLS policies
-- so regional managers can manage their assigned regions.
-- ============================================================

-- 1. Add regional_manager to app_role enum
-- PostgreSQL enums require ALTER TYPE ... ADD VALUE (cannot be in a transaction)
-- Supabase SQL Editor runs each statement, so this is safe.
DO $$ BEGIN
  -- Check if regional_manager already exists to make this idempotent
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'app_role')
      AND enumlabel = 'regional_manager'
  ) THEN
    ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'regional_manager';
  END IF;
EXCEPTION WHEN duplicate_object THEN
  -- If it already exists (race condition), just continue
  NULL;
END $$;

-- 2. RLS: Allow regional managers to read their own record in regional_managers
CREATE POLICY "Regional managers can view own record" ON public.regional_managers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'regional_manager'
    )
    AND user_id = auth.uid()
  );

-- 3. RLS: Allow regional managers to update their own record
CREATE POLICY "Regional managers can update own record" ON public.regional_managers
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'regional_manager'
    )
    AND user_id = auth.uid()
  );

-- 4. RLS: Allow regional managers to read their assigned regions
CREATE POLICY "Regional managers can view assigned regions" ON public.regions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regions.id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regions.id
             ))
    )
  );

-- 5. RLS: Allow regional managers to update their assigned regions' branding
CREATE POLICY "Regional managers can update assigned regions" ON public.regions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regions.id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regions.id
             ))
    )
  );

-- 6. RLS: Allow regional managers to manage branding for their regions
CREATE POLICY "Regional managers can manage regional branding" ON public.regional_branding
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_branding.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_branding.region_id
             ))
    )
  );

-- 7. RLS: Allow regional managers to manage settings for their regions
CREATE POLICY "Regional managers can manage regional settings" ON public.regional_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_settings.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_settings.region_id
             ))
    )
  );

-- 8. RLS: Allow regional managers to manage announcements for their regions
CREATE POLICY "Regional managers can manage regional announcements" ON public.regional_announcements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.regional_announcements.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.regional_announcements.region_id
             ))
    )
  );

-- 9. RLS: Allow regional managers to manage native games for their regions
CREATE POLICY "Regional managers can manage native games" ON public.native_games
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.regional_managers rm
      WHERE rm.user_id = auth.uid()
        AND rm.is_active = true
        AND (rm.region_ids @> ARRAY[public.native_games.region_id] OR
             EXISTS (
               SELECT 1 FROM public.region_managers j
               WHERE j.manager_id = rm.id AND j.region_id = public.native_games.region_id
             ))
    )
  );

-- 10. Helper function: Check if current user is a regional manager for a given region
CREATE OR REPLACE FUNCTION public.is_regional_manager_for_region(region_id uuid)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.regional_managers rm
    WHERE rm.user_id = auth.uid()
      AND rm.is_active = true
      AND (rm.region_ids @> ARRAY[region_id] OR
           EXISTS (
             SELECT 1 FROM public.region_managers j
             WHERE j.manager_id = rm.id AND j.region_id = region_id
           ))
  );
$$;

-- 11. Helper function: Get regions managed by current user
CREATE OR REPLACE FUNCTION public.get_my_managed_regions()
RETURNS TABLE(id uuid, country_code text, label text, is_active boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.id, r.country_code, r.label, r.is_active
  FROM public.regions r
  INNER JOIN public.regional_managers rm ON rm.is_active = true
  WHERE rm.user_id = auth.uid()
    AND (rm.region_ids @> ARRAY[r.id] OR
         EXISTS (
           SELECT 1 FROM public.region_managers j
           WHERE j.manager_id = rm.id AND j.region_id = r.id
         ));
$$;

-- 12. Update last_login trigger for regional_managers on auth events
CREATE OR REPLACE FUNCTION public.update_regional_manager_last_login()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.regional_managers
  SET last_login = now()
  WHERE user_id = auth.uid();
  RETURN NEW;
END;
$$;

-- 13. Grant usage on the enum to authenticated users (if not already granted)
GRANT USAGE ON TYPE public.app_role TO authenticated;

-- ============================================================
-- NOTES:
--
-- After running this migration, to assign regional_manager role:
--   INSERT INTO public.user_roles (user_id, role)
--   VALUES ('<user-uuid>', 'regional_manager');
--
-- Then create the manager record:
--   INSERT INTO public.regional_managers (user_id, user_email, user_name, region_ids, role)
--   VALUES ('<user-uuid>', 'email@example.com', 'Manager Name', ARRAY['<region-uuid>'], 'manager');
--
-- And optionally link via junction table:
--   INSERT INTO public.region_managers (region_id, manager_id)
--   VALUES ('<region-uuid>', '<manager-record-uuid>');
-- ============================================================
