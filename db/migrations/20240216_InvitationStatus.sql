-- Add status and revocation fields to invitations table

-- 1. Create Status Enum if not exists (or just use text check constraint for simplicity)
-- We'll use a check constraint to allow flexibility
alter table invitations 
add column if not exists status text default 'pending' check (status in ('pending', 'accepted', 'expired', 'revoked', 'rejected'));

-- 2. Add revocation details
alter table invitations
add column if not exists revoked_at timestamptz,
add column if not exists revoked_by uuid references auth.users(id);

-- 3. Update existing records
update invitations set status = 'accepted' where accepted_at is not null;
update invitations set status = 'expired' where expires_at < now() and accepted_at is null and status = 'pending';

-- 4. Create index for status
create index if not exists idx_invitations_status on invitations(status);
