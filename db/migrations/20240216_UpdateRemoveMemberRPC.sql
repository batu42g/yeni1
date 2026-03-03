create or replace function remove_member(target_user_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
  req_company_id uuid;
  target_role text;
  target_company_id uuid;
begin
  -- Requester Check
  select company_id, role into req_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active';

  if requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized';
  end if;

  -- Target Check
  select company_id, role into target_company_id, target_role
  from members
  where user_id = target_user_id
  and status = 'active';

  if req_company_id != target_company_id then
    raise exception 'Target user not found or not active';
  end if;
  
  if target_role = 'owner' then
    raise exception 'Cannot remove owner';
  end if;

  -- Soft Remove Membership
  update members
  set 
    status = 'removed',
    removed_at = now(),
    removed_by = auth.uid()
  where user_id = target_user_id and company_id = req_company_id;

  -- Clear User Context (Switch them to "No Company" mode)
  update users
  set 
    company_id = null
  where id = target_user_id and company_id = req_company_id;
  
  -- Log Audit
  insert into audit_logs (company_id, user_id, action_type, entity_type, entity_id, description)
  values (req_company_id, auth.uid(), 'DELETE', 'member', target_user_id::text, 'Member soft removed');

end;
$$;
