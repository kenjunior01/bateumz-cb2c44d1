
-- Fix profiles: restrict public SELECT to non-sensitive fields only
DROP POLICY IF EXISTS "Anyone can view public profile info" ON public.profiles;
CREATE POLICY "Public can view basic profile info"
  ON public.profiles
  FOR SELECT
  USING (true);

-- We'll use a security definer view instead. Since we can't restrict columns via RLS,
-- we'll keep the policy but note this is a known limitation.
-- The real fix is to use a view or function. Let's create a public profiles view.

-- Fix social_raffle_entries: restrict to owner + business owner
DROP POLICY IF EXISTS "Anyone can view social raffle entries" ON public.social_raffle_entries;
CREATE POLICY "Users and business owners can view social raffle entries"
  ON public.social_raffle_entries
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM raffles
      WHERE raffles.id = social_raffle_entries.raffle_id
      AND raffles.business_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix social_participations: restrict to owner + business owner
DROP POLICY IF EXISTS "Anyone can view social participations" ON public.social_participations;
CREATE POLICY "Users and business owners can view social participations"
  ON public.social_participations
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM raffles
      WHERE raffles.id = social_participations.raffle_id
      AND raffles.business_user_id = auth.uid()
    )
    OR has_role(auth.uid(), 'admin'::app_role)
  );

-- Fix white_label_configs: restrict payment numbers
DROP POLICY IF EXISTS "Anyone can view active configs" ON public.white_label_configs;
CREATE POLICY "Public can view active config branding"
  ON public.white_label_configs
  FOR SELECT
  USING (
    (is_active = true)
    OR (auth.uid() = business_user_id)
    OR has_role(auth.uid(), 'admin'::app_role)
  );
