-- Auto-draw cron job documentation and optional schedule
-- Requires pg_cron + pg_net (enabled in 20260317072709 migration)
-- Configure SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets, then run via Admin → Cron Jobs test
-- or schedule manually in Supabase SQL editor:

-- SELECT cron.schedule(
--   'auto-draw-check',
--   '*/5 * * * *',
--   $$
--   SELECT net.http_post(
--     url := 'https://ngxrdpplyghlugoowjqj.supabase.co/functions/v1/auto-draw',
--     headers := jsonb_build_object(
--       'Content-Type', 'application/json',
--       'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key' LIMIT 1)
--     ),
--     body := '{}'::jsonb
--   ) AS request_id;
--   $$
-- );

COMMENT ON COLUMN public.raffles.auto_draw_scheduled_at IS 'When set and passed, auto-draw edge function picks winners (cron every 5 min recommended)';
