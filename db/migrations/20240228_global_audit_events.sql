-- 1. Make company_id nullable for global events
ALTER TABLE public.audit_logs ALTER COLUMN company_id DROP NOT NULL;

-- 2. Update RLS policy to allow active company members to see global events for users in their company
DROP POLICY IF EXISTS "Enable select for company admins" ON public.audit_logs;
CREATE POLICY "Enable select for company admins" ON public.audit_logs FOR SELECT USING (
    -- Condition 1: Tenant specific audit logs (company scoped)
    (company_id IN (
        SELECT m.company_id FROM public.members m
        WHERE m.user_id = auth.uid()
          AND m.status = 'active'
          AND m.role IN ('admin', 'owner')
    ))
    OR
    -- Condition 2: Global user events (LOGIN_FAILED, LOGIN_SUCCESS)
    -- Show if the actor_user_id is a member of a company where the current user is an admin/owner
    (company_id IS NULL AND action IN ('LOGIN_FAILED', 'LOGIN_SUCCESS', 'PASSWORD_RESET_REQUEST', 'ACCOUNT_LOCKED') AND actor_user_id IN (
        SELECT mm_target.user_id FROM public.members mm_target
        WHERE mm_target.company_id IN (
            SELECT mm_admin.company_id FROM public.members mm_admin
            WHERE mm_admin.user_id = auth.uid()
              AND mm_admin.status = 'active'
              AND mm_admin.role IN ('admin', 'owner')
        )
    ))
);

-- Note: We might also want to ensure that global super admins can see everything, 
-- but since there's no global super admin defined yet, this matches the spec perfectly.

NOTIFY pgrst, 'reload schema';
