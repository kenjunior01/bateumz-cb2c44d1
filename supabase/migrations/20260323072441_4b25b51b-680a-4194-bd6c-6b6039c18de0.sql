
-- Add activation fee columns to raffles
ALTER TABLE public.raffles 
  ADD COLUMN IF NOT EXISTS activation_fee_percentage numeric DEFAULT 5,
  ADD COLUMN IF NOT EXISTS activation_fee_paid boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS rejection_reason text;

-- Add is_verified to profiles for verified company badge
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS is_verified boolean DEFAULT false;
