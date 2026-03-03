-- Add Seat Limit Constraints

-- 1. Add seat_limit column to companies
alter table companies 
add column if not exists seat_limit int default 5; -- Default limit for Free plan

-- 2. Update existing companies
update companies set seat_limit = 5 where seat_limit is null;

-- 3. Modify accept_invitation RPC to check limit
drop function if exists accept_invitation(text,uuid,text);
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
    raise exception 'Invalid or expired invitation token';
  end if;

  -- Check Seat Limit
  select count(*), max(seat_limit) into current_member_count, company_seat_limit
  from members m
  join companies c on m.company_id = c.id
  where m.company_id = invite_record.company_id
  and m.status = 'active';

  if current_member_count >= company_seat_limit then
    raise exception 'Company seat limit reached. Upgrade required.';
  end if;
  
  -- ... (Rest of logic: Insert member, update user, update invitation)
  
  -- Insert Member
  insert into members (company_id, user_id, role, status)
  values (invite_record.company_id, p_user_id, invite_record.role, 'active')
  on conflict (company_id, user_id)
  do update set role = EXCLUDED.role, status = 'active';

  -- Provide Access (Update User Profile)
  update users
  set company_id = invite_record.company_id, -- Set primary company context
      role = invite_record.role,
      full_name = p_full_name
  where id = p_user_id;

  -- Mark Invitation as Used
  update invitations
  set status = 'accepted', accepted_at = now(), accepted = true
  where id = invite_record.id;
  
end;
$$;
