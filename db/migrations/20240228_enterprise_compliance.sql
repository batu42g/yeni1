-- Enterprise Compliance Upgrade Migration
-- proje4_5.md spec implementation

-- =============================================
-- 1. Add severity column to audit_logs
-- =============================================
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS severity text NOT NULL DEFAULT 'info';
CREATE INDEX IF NOT EXISTS idx_audit_logs_severity ON public.audit_logs (company_id, severity, created_at DESC);

-- =============================================
-- 2. Retention policy functions
-- =============================================

-- 2a. Archive old audit logs (> 2 years)
CREATE OR REPLACE FUNCTION public.fn_audit_retention_cleanup()
RETURNS jsonb AS $$
DECLARE
  audit_deleted int;
  activity_deleted int;
BEGIN
  -- Activity events: delete older than 180 days
  DELETE FROM public.activity_events
  WHERE created_at < now() - interval '180 days';
  GET DIAGNOSTICS activity_deleted = ROW_COUNT;

  -- Audit logs: we do NOT delete (immutable).
  -- Instead we count how many are older than 2 years for reporting.
  SELECT count(*) INTO audit_deleted
  FROM public.audit_logs
  WHERE created_at < now() - interval '2 years';

  RETURN jsonb_build_object(
    'activity_events_deleted', activity_deleted,
    'audit_logs_archived_count', audit_deleted,
    'executed_at', now()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 3. Suspicious activity detection function
-- =============================================
CREATE OR REPLACE FUNCTION public.fn_check_suspicious_activity(
  p_company_id uuid,
  p_action text,
  p_actor_user_id uuid
)
RETURNS text AS $$
DECLARE
  recent_count int;
  result_severity text := 'info';
BEGIN
  -- Rule 1: 5+ failed logins in 10 minutes
  IF p_action = 'LOGIN_FAILED' THEN
    SELECT count(*) INTO recent_count
    FROM public.audit_logs
    WHERE company_id = p_company_id
      AND action = 'LOGIN_FAILED'
      AND actor_user_id = p_actor_user_id
      AND created_at > now() - interval '10 minutes';

    IF recent_count >= 4 THEN  -- current will be 5th
      result_severity := 'critical';
    ELSIF recent_count >= 2 THEN
      result_severity := 'warning';
    END IF;
  END IF;

  -- Rule 2: 3+ exports in 5 minutes
  IF p_action = 'EXPORT_DOWNLOADED' THEN
    SELECT count(*) INTO recent_count
    FROM public.audit_logs
    WHERE company_id = p_company_id
      AND action = 'EXPORT_DOWNLOADED'
      AND actor_user_id = p_actor_user_id
      AND created_at > now() - interval '5 minutes';

    IF recent_count >= 2 THEN
      result_severity := 'warning';
    END IF;
  END IF;

  -- Rule 3: Role escalation attempt
  IF p_action = 'ROLE_CHANGED' THEN
    result_severity := 'warning';
  END IF;

  RETURN result_severity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- =============================================
-- 4. Hardened RLS: audit SELECT only for admin/owner
-- =============================================
DROP POLICY IF EXISTS "Enable select for company members" ON public.audit_logs;
CREATE POLICY "Enable select for company admins" ON public.audit_logs FOR SELECT USING (
    company_id IN (
        SELECT m.company_id FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.status = 'active'
          AND m.role IN ('admin', 'owner')
    )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
