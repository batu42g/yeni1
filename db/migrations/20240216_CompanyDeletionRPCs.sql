-- 5.1 Archive Company (Soft Delete)
create or replace function archive_company(target_company_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
begin
  -- Check permission
  select role into requester_role
  from members
  where user_id = auth.uid() and company_id = target_company_id 
  and status = 'active';

  if requester_role != 'owner' then
    raise exception 'Only owner can archive company';
  end if;

  -- 1. Archive Company
  update companies
  set 
    status = 'archived',
    deleted_at = now(),
    deleted_by = auth.uid()
  where id = target_company_id;

  -- 2. Archive Memberships
  update members
  set status = 'archived'
  where company_id = target_company_id;

  -- 3. Log Audit
  insert into audit_logs (company_id, user_id, action_type, entity_type, entity_id, description)
  values (target_company_id, auth.uid(), 'UPDATE', 'company', target_company_id::text, 'Company archived');

end;
$$;

-- 5.2 Hard Delete Company
create or replace function hard_delete_company(target_company_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
begin
  -- Check permission (Need to check even if company is archived)
  select role into requester_role
  from members
  where user_id = auth.uid() and company_id = target_company_id; 

  if requester_role != 'owner' then
      raise exception 'Only owner can delete company';
  end if;

  -- Delete all related data (Cascade order)
  delete from project_files where company_id = target_company_id;
  delete from tasks where company_id = target_company_id;
  delete from projects where company_id = target_company_id;
  delete from customers where company_id = target_company_id;
  delete from offers where company_id = target_company_id;
  delete from invitations where company_id = target_company_id;
  delete from webhook_subscriptions where company_id = target_company_id;
  delete from audit_logs where company_id = target_company_id;
  
  -- Clear User Context
  update users set company_id = null where company_id = target_company_id;
  
  delete from members where company_id = target_company_id;
  delete from companies where id = target_company_id;

end;
$$;
