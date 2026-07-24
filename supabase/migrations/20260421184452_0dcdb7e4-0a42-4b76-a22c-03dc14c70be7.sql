
-- Add phases support and new contest features
ALTER TABLE public.contests 
  ADD COLUMN IF NOT EXISTS phases jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS current_phase integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS contest_mode text NOT NULL DEFAULT 'single'::text,
  ADD COLUMN IF NOT EXISTS sponsor_name text,
  ADD COLUMN IF NOT EXISTS sponsor_logo_url text,
  ADD COLUMN IF NOT EXISTS entry_fee numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_participants integer,
  ADD COLUMN IF NOT EXISTS country text,
  ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
