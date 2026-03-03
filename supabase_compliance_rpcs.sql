DROP FUNCTION IF EXISTS fn_get_compliance_status();

CREATE OR REPLACE FUNCTION fn_count_failed_logins(p_company_id UUID)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    failed_count integer;
BEGIN
    SELECT count(*) INTO failed_count
    FROM audit_logs a
    JOIN members m ON a.actor_user_id = m.user_id
    WHERE a.action = 'LOGIN_FAILED'
    AND m.company_id = p_company_id
    AND a.created_at > now() - interval '24 hours';

    RETURN failed_count;
END;
$$;

CREATE OR REPLACE FUNCTION fn_get_compliance_status()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    trigger_active boolean := false;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'audit_logs_immutable_trigger'
    ) INTO trigger_active;
    
    RETURN json_build_object(
        'is_retention_cron_active', false,
        'is_immutable_trigger_active', trigger_active
    );
END;
$$;
