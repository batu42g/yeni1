-- 4.2 Soft Delete User (Self Deactivation)
create or replace function deactivate_user(reason text)
returns void
security definer
language plpgsql
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  
  update users
  set 
    is_active = false,
    deleted_at = now(),
    deletion_reason = reason
  where id = uid;

  -- Deactivate all memberships globally
  update members
  set status = 'inactive'
  where user_id = uid;
  
  -- Log audit for each company they belong to
  -- (Simple loop or bulk insert if needed, but for now simple)

end;
$$;

-- 4.3 Hard Delete User (Self Delete)
create or replace function hard_delete_user()
returns void
security definer
language plpgsql
as $$
declare
  uid uuid;
begin
  uid := auth.uid();
  
  -- Check ownership of any active company
  if exists (
    select 1 
    from members m
    join companies c on m.company_id = c.id
    where m.user_id = uid 
    and m.role = 'owner'
    and c.status = 'active'
    and c.deleted_at is null
  ) then
      raise exception 'Cannot delete account while owning an active company. Transfer ownership or delete company first.';
  end if;

  -- Delete Data (GDPR)
  -- Order matters for FK constraints
  
  -- 1. Memberships
  delete from members where user_id = uid;
  
  -- 2. Invitations sent
  delete from invitations where invited_by = uid;
  
  -- 3. Profile
  delete from users where id = uid;
  
  -- Note: auth.users deletion needs to be handled by Supabase Admin API or a trigger on public.users deletion.
  -- We assume standard Supabase setup where deleting public.users might not cascade to auth.users without explicit trigger.
  -- But for this scope, let's assume Application Level deletion handles auth via Admin API if needed.
  
end;
$$;
