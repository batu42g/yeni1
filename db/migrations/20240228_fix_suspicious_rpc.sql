-- Update suspicious activity detection to handle NULL company_ids for global events
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
  IF p_action = 'LOGIN_FAILED' THEN
    SELECT count(*) INTO recent_count
    FROM public.audit_logs
    WHERE company_id IS NOT DISTINCT FROM p_company_id
      AND action = 'LOGIN_FAILED'
      AND actor_user_id = p_actor_user_id
      AND created_at > now() - interval '10 minutes';
    IF recent_count >= 4 THEN
      result_severity := 'critical';
    ELSIF recent_count >= 2 THEN
      result_severity := 'warning';
    END IF;
  END IF;

  IF p_action = 'EXPORT_DOWNLOADED' THEN
    SELECT count(*) INTO recent_count
    FROM public.audit_logs
    WHERE company_id IS NOT DISTINCT FROM p_company_id
      AND action = 'EXPORT_DOWNLOADED'
      AND actor_user_id = p_actor_user_id
      AND created_at > now() - interval '5 minutes';
    IF recent_count >= 2 THEN
      result_severity := 'warning';
    END IF;
  END IF;

  IF p_action = 'ROLE_CHANGED' THEN
    result_severity := 'warning';
  END IF;

  RETURN result_severity;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
