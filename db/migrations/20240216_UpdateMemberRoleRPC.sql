create or replace function update_member_role(target_user_id uuid, new_role text)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
  req_company_id uuid;
  target_company_id uuid;
  target_current_role text;
begin
  -- Requester Context
  select company_id, role into req_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active';

  if requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized';
  end if;

  -- Target Context
  select company_id, role into target_company_id, target_current_role
  from members
  where user_id = target_user_id;

  -- Validation
  if req_company_id != target_company_id then
    raise exception 'User not found in your company';
  end if;

  if target_current_role = 'owner' then
     raise exception 'Cannot change role of an owner';
  end if;
  
  if target_user_id = auth.uid() then
    if new_role != 'admin' and new_role != 'owner' then
       raise exception 'Cannot demote yourself';
    end if;
  end if;

  -- Update members table
  update members
  set role = new_role
  where user_id = target_user_id and company_id = req_company_id;
  
  -- Update users table (active context)
  update users
  set role = new_role
  where id = target_user_id and company_id = req_company_id;

end;
$$;
