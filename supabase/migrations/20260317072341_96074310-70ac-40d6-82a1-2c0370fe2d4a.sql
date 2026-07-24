
-- Add new columns to raffles for draw mode, hide prize, auto-draw
ALTER TABLE public.raffles
  ADD COLUMN IF NOT EXISTS draw_mode text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS hide_prize_value boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_draw_days integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS tickets_threshold integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS auto_draw_scheduled_at timestamp with time zone DEFAULT NULL;

-- draw_mode: 'manual' (owner triggers draw), 'auto_sold_out' (auto after all tickets sold + X days)
-- hide_prize_value: hides the monetary value from public view
-- auto_draw_days: days after threshold met to auto-draw winner
-- tickets_threshold: number of tickets that triggers countdown (NULL = all tickets)
-- auto_draw_scheduled_at: when the auto-draw is scheduled to happen

COMMENT ON COLUMN public.raffles.draw_mode IS 'manual or auto_sold_out';
COMMENT ON COLUMN public.raffles.auto_draw_days IS 'Days after threshold to auto-draw';
COMMENT ON COLUMN public.raffles.tickets_threshold IS 'Ticket count to trigger countdown, NULL means all';
