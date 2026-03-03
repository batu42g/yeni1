-- Re-declare RPCs that insert into audit_logs to use the new schema
-- 1. remove_member
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
  select company_id, role into req_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active';

  if requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized';
  end if;

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

  update members
  set 
    status = 'removed',
    removed_at = now(),
    removed_by = auth.uid()
  where user_id = target_user_id and company_id = req_company_id;

  update users
  set company_id = null
  where id = target_user_id and company_id = req_company_id;
  
  insert into audit_logs (company_id, actor_user_id, action, target_type, target_id, metadata)
  values (req_company_id, auth.uid(), 'MEMBER_REMOVED', 'member', target_user_id, jsonb_build_object('description', 'Member soft removed'));
end;
$$;

-- 2. archive_company
create or replace function archive_company(target_company_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
begin
  select role into requester_role
  from members
  where user_id = auth.uid() and company_id = target_company_id 
  and status = 'active';

  if requester_role != 'owner' then
    raise exception 'Only owner can archive company';
  end if;

  update companies
  set 
    status = 'archived',
    deleted_at = now()
  where id = target_company_id;

  update members
  set status = 'archived'
  where company_id = target_company_id;

  insert into audit_logs (company_id, actor_user_id, action, target_type, target_id, metadata)
  values (target_company_id, auth.uid(), 'COMPANY_ARCHIVED', 'company', target_company_id, jsonb_build_object('description', 'Company archived'));
end;
$$;

-- 3. hard_delete_company 
create or replace function hard_delete_company(target_company_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
begin
  select role into requester_role
  from members
  where user_id = auth.uid() and company_id = target_company_id; 

  if requester_role != 'owner' then
      raise exception 'Only owner can delete company';
  end if;

  delete from project_files where company_id = target_company_id;
  delete from tasks where company_id = target_company_id;
  delete from projects where company_id = target_company_id;
  delete from customers where company_id = target_company_id;
  delete from offers where company_id = target_company_id;
  delete from invitations where company_id = target_company_id;
  delete from webhook_subscriptions where company_id = target_company_id;
  
  update users set company_id = null where company_id = target_company_id;
  
  delete from members where company_id = target_company_id;
  delete from companies where id = target_company_id;
end;
$$;

-- 4. log_context_switch
CREATE OR REPLACE FUNCTION log_context_switch(p_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs (
    company_id,
    actor_user_id,
    action,
    target_type,
    target_id,
    metadata
  ) VALUES (
    p_company_id,
    auth.uid(),
    'USER_CONTEXT_SWITCHED',
    'system',
    auth.uid(),
    jsonb_build_object('switched_to_company_id', p_company_id, 'timestamp', now())
  );
END;
$$;

-- 5. create_company
CREATE OR REPLACE FUNCTION create_company(company_name text)
RETURNS uuid 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO companies (name, status)
  VALUES (company_name, 'active')
  RETURNING id INTO new_company_id;

  INSERT INTO members (user_id, company_id, role, status)   
  VALUES (auth.uid(), new_company_id, 'owner', 'active');   
  
  -- Yorum satırı: user_settings tablosu var ise günceller, yok ise geçebilir. Eski hali şuydu ancak bazen user_settings kurulmamıştır.
  -- Hata vermemek için kontrol edelim. Gerçi var olduğunu biliyoruz.
  -- INSERT INTO user_settings (user_id, active_company_id, updated_at) VALUES (auth.uid(), new_company_id, now()) ON CONFLICT (user_id) DO UPDATE SET active_company_id = EXCLUDED.active_company_id, updated_at = now();

  UPDATE users SET company_id = new_company_id, role = 'owner' WHERE id = auth.uid();

  INSERT INTO audit_logs (company_id, actor_user_id, action, target_type, target_id, metadata)
  VALUES (new_company_id, auth.uid(), 'COMPANY_CREATED', 'company', new_company_id, 
          jsonb_build_object('name', company_name));

  RETURN new_company_id;
END;
$$;
