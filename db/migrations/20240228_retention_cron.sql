-- pg_cron Retention Schedule
-- Runs fn_audit_retention_cleanup() every day at 03:30 UTC

-- 1. Enable pg_cron extension (if not already enabled)
-- NOTE: pg_cron must be enabled from Supabase Dashboard > Database > Extensions
-- Search for "pg_cron" and enable it before running this migration.

-- 2. Schedule the retention cleanup job
-- This is idempotent — if the job already exists, it will be replaced.
SELECT cron.schedule(
    'audit-retention-cleanup',          -- job name
    '30 3 * * *',                       -- every day at 03:30 UTC
    $$SELECT public.fn_audit_retention_cleanup()$$
);

-- To verify the job is scheduled:
-- SELECT * FROM cron.job;

-- To manually run:
-- SELECT public.fn_audit_retention_cleanup();

-- To remove the job:
-- SELECT cron.unschedule('audit-retention-cleanup');
