-- Fix User Visibility Policies
-- Ensure RLS is enabled
alter table users enable row level security;

-- Drop potential conflicting policies
drop policy if exists "Users can view own company members" on users;
drop policy if exists "Admins can view company members" on users;
drop policy if exists "Admins can update company members" on users;
drop policy if exists "Admins can delete company members" on users;

-- 1. Allow all users to view members of their own company
create policy "Users can view own company members" on users
  for select using (
    auth.uid() = id 
    or 
    (select company_id from users where id = auth.uid()) = company_id
  );

-- 2. Allow admins to update members (e.g. change role)
create policy "Admins can update company members" on users
  for update using (
    (select role from users where id = auth.uid()) = 'admin'
    and
    (select company_id from users where id = auth.uid()) = company_id
  );
  
-- 3. Allow admins to delete members
create policy "Admins can delete company members" on users
  for delete using (
    (select role from users where id = auth.uid()) = 'admin'
    and
    (select company_id from users where id = auth.uid()) = company_id
  );
