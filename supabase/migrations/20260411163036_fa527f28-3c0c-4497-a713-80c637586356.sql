ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS province text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS interests text[] DEFAULT '{}';