-- Clean up existing objects to prevent conflicts
drop table if exists invitations cascade;
drop function if exists validate_invitation;
drop function if exists complete_invitation_signup;

-- Create Invitations Table
create table invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  invited_by uuid references users(id) not null, -- Tracks who sent the invite
  email text not null,
  role text not null check (role in ('admin', 'staff')),
  token uuid default gen_random_uuid() not null unique,
  expires_at timestamptz not null default (now() + interval '48 hours'),
  accepted boolean default false,
  created_at timestamptz default now()
);

-- Enable RLS
alter table invitations enable row level security;

-- Policies
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
begin
  -- Validate
  select * into invite from invitations where token = token_input and accepted = false;
  
  if not found then
    raise exception 'Invalid invitation';
  end if;
  
  -- Insert into public.users (This will link the new auth user to the company)
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
  
  -- Mark invitation as accepted
  update invitations set accepted = true where id = invite.id;
end;
$$;
