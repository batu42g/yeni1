CREATE OR REPLACE FUNCTION public.fn_count_failed_logins(p_company_id uuid)
RETURNS int AS $$
DECLARE
    login_count int;
BEGIN
    SELECT count(*)
    INTO login_count
    FROM public.audit_logs a
    JOIN public.members m ON a.actor_user_id = m.user_id
    WHERE a.action = 'LOGIN_FAILED'
      AND m.company_id = p_company_id
      AND a.created_at > now() - interval '24 hours';
      
    RETURN COALESCE(login_count, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
