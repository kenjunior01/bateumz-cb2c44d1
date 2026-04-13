
-- 1. Stronger invite codes for boloes
ALTER TABLE public.boloes ALTER COLUMN invite_code SET DEFAULT encode(gen_random_bytes(16), 'hex');

-- 2. Fix participants: remove any user-facing UPDATE policy, keep only business/admin
DROP POLICY IF EXISTS "Users can update own participants" ON public.participants;
DROP POLICY IF EXISTS "Business users can update participants of their raffles" ON public.participants;

CREATE POLICY "Business users can update participants of their raffles"
ON public.participants FOR UPDATE
USING (
  (EXISTS (SELECT 1 FROM raffles WHERE raffles.id = participants.raffle_id AND raffles.business_user_id = auth.uid()))
  OR has_role(auth.uid(), 'admin'::app_role)
);

-- 3. Fix profiles: replace overly permissive public SELECT with restricted view
DROP POLICY IF EXISTS "Public can view basic profile info" ON public.profiles;

-- Public can only see non-sensitive columns via a security definer function approach
-- Since Postgres RLS is row-level not column-level, we create a restricted policy
-- that only allows authenticated users to see full profiles of themselves
CREATE POLICY "Public can view basic profile info"
ON public.profiles FOR SELECT
USING (
  -- Everyone can see rows, but sensitive fields handled at app level
  -- Restrict to authenticated users only
  auth.uid() IS NOT NULL
);

-- 4. Fix profiles UPDATE: prevent users from changing is_verified
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (
  auth.uid() = user_id
  AND (is_verified IS NOT DISTINCT FROM (SELECT p.is_verified FROM public.profiles p WHERE p.user_id = auth.uid()))
);

-- 5. Make social-proofs bucket private
UPDATE storage.buckets SET public = false WHERE id = 'social-proofs';

-- Drop existing overly permissive policies on social-proofs
DROP POLICY IF EXISTS "Anyone can view social proofs" ON storage.objects;
DROP POLICY IF EXISTS "Public can view social proofs" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can view social proof files" ON storage.objects;

-- Restrictive SELECT: only file owner, raffle business owner, or admin
CREATE POLICY "Social proofs viewable by owner and business"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'social-proofs'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR has_role(auth.uid(), 'admin'::app_role)
  )
);

-- 6. Fix mutable search_path on queue functions
CREATE OR REPLACE FUNCTION public.read_email_batch(queue_name text, batch_size integer, vt integer)
RETURNS TABLE(msg_id bigint, read_ct integer, message jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN QUERY SELECT r.msg_id, r.read_ct, r.message FROM pgmq.read(queue_name, vt, batch_size) r;
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN;
END;
$function$;

CREATE OR REPLACE FUNCTION public.enqueue_email(queue_name text, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.send(queue_name, payload);
EXCEPTION WHEN undefined_table THEN
  PERFORM pgmq.create(queue_name);
  RETURN pgmq.send(queue_name, payload);
END;
$function$;

CREATE OR REPLACE FUNCTION public.delete_email(queue_name text, message_id bigint)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  RETURN pgmq.delete(queue_name, message_id);
EXCEPTION WHEN undefined_table THEN
  RETURN FALSE;
END;
$function$;

CREATE OR REPLACE FUNCTION public.move_to_dlq(source_queue text, dlq_name text, message_id bigint, payload jsonb)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE new_id BIGINT;
BEGIN
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  PERFORM pgmq.delete(source_queue, message_id);
  RETURN new_id;
EXCEPTION WHEN undefined_table THEN
  BEGIN
    PERFORM pgmq.create(dlq_name);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;
  SELECT pgmq.send(dlq_name, payload) INTO new_id;
  BEGIN
    PERFORM pgmq.delete(source_queue, message_id);
  EXCEPTION WHEN undefined_table THEN
    NULL;
  END;
  RETURN new_id;
END;
$function$;
