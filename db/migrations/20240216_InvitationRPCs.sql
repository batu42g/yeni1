-- Revoke Invitation
create or replace function revoke_invitation(invite_id uuid)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
  req_company_id uuid;
begin
  select company_id, role into req_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active';

  if requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized';
  end if;

  if not exists (select 1 from invitations where id = invite_id and company_id = req_company_id) then
    raise exception 'Invitation not found or not in your company';
  end if;

  update invitations
  set status = 'revoked', revoked_at = now(), revoked_by = auth.uid()
  where id = invite_id and status = 'pending';

  if not found then
    raise exception 'Invitation is not pending';
  end if;
end;
$$;

-- Resend Invitation (Update Token & Expiry)
create or replace function resend_invitation(invite_id uuid, new_token_hash text, new_expiry timestamptz)
returns void
security definer
language plpgsql
as $$
declare
  requester_role text;
  req_company_id uuid;
begin
  select company_id, role into req_company_id, requester_role
  from members
  where user_id = auth.uid() and status = 'active';

  if requester_role not in ('admin', 'owner') then
    raise exception 'Unauthorized';
  end if;

  update invitations
  set 
    token_hash = new_token_hash, 
    expires_at = new_expiry, 
    status = 'pending', -- Reset status just in case
    created_at = now() -- Update created_at to appear fresh
  where id = invite_id and company_id = req_company_id;
  
  if not found then
    raise exception 'Invitation not found';
  end if;
end;
$$;
