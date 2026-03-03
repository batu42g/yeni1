-- Clean up existing objects to prevent conflicts
drop function if exists validate_invitation;
drop function if exists complete_invitation_signup;

-- Function to validate invitation token (Publicly accessible via RPC)
create or replace function validate_invitation(token_input uuid)
returns json
language plpgsql
security definer
as $$
declare
  invite invitations;
  company_name text;
  inviter_name text;
begin
  select * into invite from invitations where token = token_input and accepted = false and expires_at > now();
  
  if not found then
    return json_build_object('valid', false);
  end if;
  
  select name into company_name from companies where id = invite.company_id;
  select full_name into inviter_name from users where id = invite.invited_by;
  
  return json_build_object(
    'valid', true,
    'email', invite.email,
    'company_name', company_name,
    'inviter_name', inviter_name,
    'role', invite.role
  );
end;
$$;

-- Function to complete signup with invitation
create or replace function complete_invitation_signup(token_input uuid)
returns void
language plpgsql
security definer
as $$
declare
  invite invitations;
begin
  -- Validate
  select * into invite from invitations where token = token_input and accepted = false;
  
  if not found then
    raise exception 'Invalid invitation';
  end if;
  
  -- Insert into public.users (This will link the new auth user to the company)
  -- Uses ON CONFLICT to update if user somehow exists but ensure we don't duplicate ID error
  insert into public.users (id, company_id, email, full_name, role)
  values (
    auth.uid(), 
    invite.company_id, 
    invite.email, 
    (select raw_user_meta_data->>'full_name' from auth.users where id = auth.uid()),
    invite.role
  )
  on conflict (id) do update 
  set company_id = excluded.company_id, role = excluded.role;
  
  -- Also ensure membership record is created
  insert into members (company_id, user_id, role, status)
  values (invite.company_id, auth.uid(), invite.role, 'active')
  on conflict (company_id, user_id) 
  do update set role = EXCLUDED.role, status = 'active';

  -- Mark invitation as accepted
  update invitations set accepted = true where id = invite.id;
end;
$$;
