-- Advanced Deletion Architecture & Membership System

-- 1. Update Users Table for Soft Delete Support
alter table users add column if not exists deleted_at timestamptz;
alter table users add column if not exists is_active boolean default true;
alter table users add column if not exists deletion_reason text;

-- 2. Create Memberships Table (Multi-Tenant Foundation)
create table if not exists members (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references users(id) on delete cascade not null,
  company_id uuid references companies(id) on delete cascade not null,
  role text not null check (role in ('admin', 'staff', 'owner')),
  
  -- Status for Soft Delete / Archiving
  status text not null default 'active' check (status in ('active', 'inactive', 'removed', 'archived')),
  
  -- Audit Timestamps
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  removed_at timestamptz,
  removed_by uuid references users(id), -- Audit: Who performed the removal?
  
  unique(user_id, company_id) -- Ensure unique membership per company
);

-- Performance Indexes
create index if not exists members_user_id_idx on members(user_id);
create index if not exists members_company_id_idx on members(company_id);
create index if not exists members_status_idx on members(status);

-- 3. Data Migration: Sync existing users to members table
insert into members (user_id, company_id, role, status)
select id, company_id, role, 'active'
from users
where company_id is not null
on conflict (user_id, company_id) do nothing;

-- 4. Enable RLS on Members Table
alter table members enable row level security;

-- Policies

-- View: Admins can view all members of their company; Users can view their own memberships
create policy "Admins View Members" on members
  for select using (
    exists (
      select 1 from members as requester
      where requester.user_id = auth.uid()
      and requester.company_id = members.company_id
      and requester.role = 'admin'
    )
    or user_id = auth.uid()
  );

-- Update: Only Admins can update status (Remove/Ban)
create policy "Admins Update Members" on members
  for update using (
    exists (
      select 1 from members as requester
      where requester.user_id = auth.uid()
      and requester.company_id = members.company_id
      and requester.role = 'admin'
    )
  );

-- 5. Trigger to Sync `is_active` on User Soft Delete
-- If a user is soft-deleted globally, invalidate all memberships
create or replace function handle_user_soft_delete()
returns trigger
language plpgsql
as $$
begin
  if new.deleted_at is not null then
    update members
    set status = 'inactive'
    where user_id = new.id;
  end if;
  return new;
end;
$$;

create or replace trigger on_user_soft_delete
after update of deleted_at on users
for each row
execute function handle_user_soft_delete();
