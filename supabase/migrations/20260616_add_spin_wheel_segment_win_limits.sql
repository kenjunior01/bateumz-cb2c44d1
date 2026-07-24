-- Add win limits and current win counts to spin_wheel_segments
ALTER TABLE public.spin_wheel_segments
ADD COLUMN IF NOT EXISTS max_wins_per_day INTEGER,
ADD COLUMN IF NOT EXISTS max_wins_total INTEGER,
ADD COLUMN IF NOT EXISTS current_wins_today INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_wins_total INTEGER DEFAULT 0;

-- Add RLS policies for the new columns if needed (assuming existing policies cover updates by creators)
-- For simplicity, assuming existing policies on spin_wheel_segments are sufficient for now.

-- Function to reset daily win counts (to be called by a daily cron job)
CREATE OR REPLACE FUNCTION public.reset_daily_spin_wheel_wins()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.spin_wheel_segments
  SET current_wins_today = 0;
END;
$$;

-- Grant execution to service role for cron job
GRANT EXECUTE ON FUNCTION public.reset_daily_spin_wheel_wins() TO service_role;
