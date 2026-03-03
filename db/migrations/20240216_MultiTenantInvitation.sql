-- Production Grade Invitation System Setup
-- Warning: This resets the invitations table.
drop table if exists invitations cascade;

create table invitations (
  id uuid default gen_random_uuid() primary key,
  company_id uuid references companies(id) on delete cascade not null,
  invited_by uuid references users(id) not null,
  email text not null,
  role text not null check (role in ('admin', 'staff')),
  token_hash text not null unique, -- Store SHA256 hash of the token, not the raw token
  expires_at timestamptz not null default (now() + interval '48 hours'),
  accepted boolean default false,
  accepted_at timestamptz,
  created_at timestamptz default now()
);

-- Performance Indexes
create index invitations_token_hash_idx on invitations(token_hash);
create index invitations_email_idx on invitations(email);
create index invitations_company_id_idx on invitations(company_id);

-- Enable RLS
alter table invitations enable row level security;

-- Admin View Policy
create policy "Admins can view company invitations" on invitations
  for select using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.company_id = invitations.company_id
      and users.role = 'admin'
    )
  );

-- Admin Create Policy
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
  
-- Admin Delete Policy
create policy "Admins can delete invitations" on invitations
  for delete using (
    exists (
      select 1 from users
      where users.id = auth.uid()
      and users.company_id = invitations.company_id
      and users.role = 'admin'
    )
  );

-- Note: No public access policies or RPCs are created here.
-- Validation and Acceptance will be handled via Server-Side API Routes using the Service Role Key.
