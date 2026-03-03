-- Create Invitations Table with invited_by tracking
create table if not exists invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  invited_by uuid references users(id) not null,
  email text not null,
  role text not null check (role in ('admin', 'staff')),
  token uuid default gen_random_uuid() not null unique,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  accepted boolean default false,
  created_at timestamptz default now()
);

-- RLS policies
alter table invitations enable row level security;

create policy "Admins can view company invitations" on invitations
  for select using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.company_id = invitations.company_id
      and users.role = 'admin'
    )
  );

create policy "Admins can create invitations" on invitations
  for insert with check (
    invited_by = auth.uid() 
    and exists (
      select 1 from users
      where users.id = auth.uid()
      and users.company_id = invitations.company_id
      and users.role = 'admin'
    )
  );
  
create policy "Admins can delete invitations" on invitations
  for delete using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.company_id = invitations.company_id
      and users.role = 'admin'
    )
  );

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
  current_user_email text;
begin
  -- Validate
  select * into invite from invitations where token = token_input and accepted = false;
  
  if not found then
    raise exception 'Invalid invitation';
  end if;
  
  -- Security check: Email must match (optional but recommended)
  -- select email into current_user_email from auth.users where id = auth.uid();
  -- if current_user_email != invite.email then
  --   raise exception 'Email mismatch';
  -- end if;
  
  -- Insert into public.users
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
  
  -- Mark accepted
  update invitations set accepted = true where id = invite.id;
end;
$$;
