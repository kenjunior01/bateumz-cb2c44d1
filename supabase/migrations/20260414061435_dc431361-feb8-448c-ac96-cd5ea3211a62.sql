-- Add ticket_number column to social_raffle_entries
ALTER TABLE public.social_raffle_entries
ADD COLUMN ticket_number integer;

-- Ensure no two entries in the same raffle can have the same ticket number
CREATE UNIQUE INDEX idx_social_raffle_entries_raffle_ticket
ON public.social_raffle_entries (raffle_id, ticket_number)
WHERE ticket_number IS NOT NULL;