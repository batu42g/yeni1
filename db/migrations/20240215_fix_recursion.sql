-- Fix Infinite Recursion in RLS Policies

-- 1. Helper function to get current user's company_id (Bypasses RLS to prevent recursion)
create or replace function get_my_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.users where id = auth.uid();
$$;

-- 2. Helper function to check if current user is admin (Bypasses RLS)
create or replace function is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.users where id = auth.uid() and role = 'admin'
  );
$$;

-- 3. Reset Policies
drop policy if exists "Users can view own company members" on users;
drop policy if exists "Admins can view company members" on users;
drop policy if exists "Admins can update company members" on users;
drop policy if exists "Admins can delete company members" on users;

-- 4. Create Safe Policies

-- View: Everyone can see themselves AND their company members
create policy "Users can view own company members" on users
  for select using (
    auth.uid() = id 
    or 
    get_my_company_id() = company_id
  );

-- Update: Only Admins can update members of their company
create policy "Admins can update company members" on users
  for update using (
    is_admin() 
    and 
    get_my_company_id() = company_id
  );

-- Delete: Only Admins can delete members of their company
create policy "Admins can delete company members" on users
  for delete using (
    is_admin() 
    and 
    get_my_company_id() = company_id
  );
