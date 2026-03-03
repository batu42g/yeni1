-- Secure Member Removal Function
-- Handles RBAC checks, soft deletion, and context cleanup in a single transaction

create or replace function remove_member(target_user_id uuid)
returns void
security definer -- Bypass RLS
language plpgsql
as $$
declare
  requester_role text;
  target_role text;
  requester_company_id uuid;
begin
  -- 1. Get Requester Info (must be active member of valid company)
  select company_id, role into requester_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active'
  limit 1;

  if requester_role is null or requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized: Only admins and owners can remove members';
  end if;

  -- 2. Get Target Info
  select role into target_role
  from members
  where user_id = target_user_id and company_id = requester_company_id;

  if target_role is null then
    raise exception 'Target user not found in your company';
  end if;

  -- 3. RBAC Checks
  -- Rule: Admin cannot remove Owner
  if target_role = 'owner' and requester_role != 'owner' then
    raise exception 'Admins cannot remove Owners';
  end if;

  -- Rule: Cannot remove the last owner
  if target_role = 'owner' then
    if (select count(*) from members where company_id = requester_company_id and role = 'owner' and status = 'active') <= 1 then
      raise exception 'Cannot remove the last owner. Transfer ownership first.';
    end if;
  end if;

  -- 4. Perform Removal (Soft Delete in Members)
  update members
  set status = 'removed',
      removed_at = now(),
      removed_by = auth.uid()
  where user_id = target_user_id and company_id = requester_company_id;

  -- 5. Update Users Table (Clear Context)
  -- Only if the user's current context matches the company being removed from
  update users
  set company_id = null,
      role = 'staff' -- Reset to default
  where id = target_user_id and company_id = requester_company_id;
  
  -- 6. Audit Log
  insert into audit_logs (company_id, user_id, action_type, entity_type, entity_id, description)
  values (requester_company_id, auth.uid(), 'DELETE', 'member', target_user_id::text, 'Member removed via RPC');

end;
$$;
