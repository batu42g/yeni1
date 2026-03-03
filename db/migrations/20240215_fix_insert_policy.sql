-- Allow users to insert their own profile
-- This is often required even if RPCs are used, depending on how the Trigger is configured
create policy "Users can insert their own profile" on users
  for insert with check (auth.uid() = id);
  
-- Ensure RPC functions are truly Security Definer (Bypass RLS)
-- Re-run this to be sure
create or replace function complete_invitation_signup(token_input uuid)
returns void
language plpgsql
security definer -- IMPORTANT: Bypass RLS
as $$
declare
  invite invitations;
begin
  -- Validate
  select * into invite from invitations where token = token_input and accepted = false;
  
  if not found then
    raise exception 'Invalid invitation';
  end if;
  
  -- Insert into public.users (Bypassing RLS due to security definer)
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
  
  -- Mark as accepted
  update invitations set accepted = true where id = invite.id;
end;
$$;
