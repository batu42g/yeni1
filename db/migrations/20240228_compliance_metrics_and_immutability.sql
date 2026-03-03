-- 1. IMMUTABILITY: Make audit_logs strictly insert-only via Trigger
CREATE OR REPLACE FUNCTION public.fn_prevent_audit_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'Audit logs are immutable. UPDATE and DELETE operations are forbidden.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS tr_audit_logs_immutable ON public.audit_logs;
CREATE TRIGGER tr_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON public.audit_logs
  FOR EACH ROW EXECUTE FUNCTION public.fn_prevent_audit_modification();

-- 2. DYNAMIC COMPLIANCE STATUS RPC
CREATE OR REPLACE FUNCTION public.fn_get_compliance_status()
RETURNS jsonb AS $$
DECLARE
  is_immutable boolean := false;
  is_cron_active boolean := false;
BEGIN
  -- Check if our immutable trigger is active
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgname = 'tr_audit_logs_immutable'
  ) INTO is_immutable;

  -- Check if cron extension exists and the job is scheduled
  -- We use dynamic SQL or exception handling to avoid errors if cron schema doesn't exist
  BEGIN
    PERFORM 1 FROM pg_extension WHERE extname = 'pg_cron';
    IF FOUND THEN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM cron.job WHERE jobname = ''audit-retention-cleanup'')' INTO is_cron_active;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    is_cron_active := false;
  END;

  RETURN jsonb_build_object(
    'is_immutable_trigger_active', is_immutable,
    'is_retention_cron_active', is_cron_active
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
