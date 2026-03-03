-- Fix Recursive RLS Policy on Members table
-- Using a SECURITY DEFINER function to break the infinite recursion loop in RLS policies

-- 1. Create Helper Function
create or replace function is_company_admin_or_owner(target_company_id uuid)
returns boolean
security definer -- Bypass RLS
language plpgsql
as $$
begin
  return exists (
    select 1
    from members
    where user_id = auth.uid()
    and company_id = target_company_id
    and role in ('admin', 'owner')
    and status = 'active'
  );
end;
$$;

-- 2. Update Policies

-- SELECT Policy
drop policy if exists "Admins View Members" on members;
create policy "Admins View Members" on members
  for select using (
    user_id = auth.uid() 
    or
    is_company_admin_or_owner(company_id)
  );

-- UPDATE Policy
drop policy if exists "Admins Update Members" on members;
create policy "Admins Update Members" on members
  for update using (
    is_company_admin_or_owner(company_id)
  );

-- DELETE Policy (if needed, though we use soft delete via UPDATE)
drop policy if exists "Admins Delete Members" on members;
create policy "Admins Delete Members" on members
  for delete using (
    is_company_admin_or_owner(company_id)
  );
