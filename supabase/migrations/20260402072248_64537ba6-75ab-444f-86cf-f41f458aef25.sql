
ALTER TABLE public.raffles DROP CONSTRAINT raffles_status_check;
ALTER TABLE public.raffles ADD CONSTRAINT raffles_status_check 
  CHECK (status = ANY (ARRAY['draft', 'active', 'completed', 'cancelled', 'pending_activation', 'pending_payment', 'rejected']));
