-- 1. Users Table Updates
alter table users 
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references auth.users(id), -- Reference auth.users usually, or public.users
add column if not exists deletion_reason text,
add column if not exists is_active boolean default true;

-- Index for performance
create index if not exists idx_users_is_active on users(is_active);

-- 2. Members Table Updates
alter table members drop constraint if exists members_status_check;
alter table members add constraint members_status_check 
check (status in ('active', 'inactive', 'removed', 'archived'));

alter table members
add column if not exists removed_at timestamptz,
add column if not exists removed_by uuid references users(id);

-- 3. Companies Table Updates
alter table companies
add column if not exists deleted_at timestamptz,
add column if not exists deleted_by uuid references users(id),
add column if not exists status text default 'active' check (status in ('active', 'archived', 'deleted', 'suspended'));

-- Index
create index if not exists idx_companies_status on companies(status);
