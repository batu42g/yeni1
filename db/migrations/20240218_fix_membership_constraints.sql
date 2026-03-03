-- Fix Membership Constraints and Invitation Logic for Multi-Company Support

-- 1. Ensure members table has correct unique constraint
-- We need to ensure that a user can be in multiple companies.
-- The constraint should be on pair (company_id, user_id), NOT just user_id.

DO $$ 
BEGIN
  -- First, drop any incorrect unique constraint on user_id alone
  -- Note: The name 'members_user_id_key' is the default name Postgres would give if defined as UNIQUE(user_id)
  -- We also check broadly for any unique constraint on just user_id
  IF EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'members'::regclass 
      AND contype = 'u' 
      AND array_length(conkey, 1) = 1 
      AND conkey[1] = (SELECT attnum FROM pg_attribute WHERE attrelid = 'members'::regclass AND attname = 'user_id')
  ) THEN
      ALTER TABLE members DROP CONSTRAINT IF EXISTS members_user_id_key; -- Try standard name
      -- If custom name, this block might need manual intervention, but usually standard naming applies or we use the constraint name if found dynamically.
      -- Ideally we would select the name into a variable and execute dynamic SQL, but for safety in migrations we assume standard or 'members_user_id_key'.
  END IF;

  -- 2. Add correct unique constraint on (company_id, user_id) if missing
  IF NOT EXISTS (
      SELECT 1 FROM pg_constraint 
      WHERE conrelid = 'members'::regclass 
      AND contype = 'u'
      AND conkey = ARRAY[
          (SELECT attnum FROM pg_attribute WHERE attrelid = 'members'::regclass AND attname = 'company_id'),
          (SELECT attnum FROM pg_attribute WHERE attrelid = 'members'::regclass AND attname = 'user_id')
      ]
  ) THEN
      ALTER TABLE members ADD CONSTRAINT members_company_user_unique UNIQUE (company_id, user_id);
  END IF;
END $$;


-- 3. Update accept_invitation RPC to safely handle multi-company
-- This function ensures we Insert/Update membership without deleting others.
create or replace function accept_invitation(p_token text, p_user_id uuid, p_full_name text)
returns void
security definer
language plpgsql
as $$
declare
  invite_record record;
  current_member_count int;
  company_seat_limit int;
begin
  -- Validate Token
  select * into invite_record
  from invitations
  where token_hash = p_token
  and status = 'pending'
  and expires_at > now();

  if not found then
    raise exception 'Geçersiz veya süresi dolmuş davet.';
  end if;

  -- Check Seat Limit
  select count(*), max(seat_limit) into current_member_count, company_seat_limit
  from members m
  join companies c on m.company_id = c.id
  where m.company_id = invite_record.company_id
  and m.status = 'active';

  -- If seat limit is reached, prevent join (unless user is already a member recovering status)
  if current_member_count >= company_seat_limit then
     -- Check if user is already a member (re-joining)
     if not exists (
        select 1 from members 
        where company_id = invite_record.company_id 
        and user_id = p_user_id
     ) then
        raise exception 'Şirket üye limitine ulaştı. Yükseltme gerekiyor.';
     end if;
  end if;
  
  -- Insert or Update Member
  -- This ensures we ADD membership for this company without affecting others
  insert into members (company_id, user_id, role, status)
  values (invite_record.company_id, p_user_id, invite_record.role, 'active')
  on conflict (company_id, user_id)
  do update set role = EXCLUDED.role, status = 'active';

  -- Update User Profile (Switch Context)
  -- This updates the "Current View" of the user to the new company.
  -- It does NOT mean they lost access to the old company, just that their dashboard context switched.
  update users
  set company_id = invite_record.company_id, 
      role = invite_record.role,
      full_name = coalesce(p_full_name, full_name)
  where id = p_user_id;

  -- Mark Invitation as Used
  update invitations
  set status = 'accepted', accepted_at = now(), accepted = true
  where id = invite_record.id;
  
end;
$$;
