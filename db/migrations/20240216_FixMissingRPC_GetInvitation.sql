-- This migration creates the missing RPC function get_invitation_by_token
-- which is used in the registration flow but was not present in previous migrations.

drop function if exists get_invitation_by_token(text);
create or replace function get_invitation_by_token(p_token text)
returns table (
  id uuid,
  company_id uuid,
  company_name text,
  email text,
  role text,
  invited_by uuid,
  invited_by_name text,
  expires_at timestamptz,
  is_valid boolean
)
language plpgsql
security definer
as $$
begin
  return query
  select 
    i.id,
    i.company_id,
    c.name as company_name,
    i.email,
    i.role::text, 
    i.invited_by,
    u.full_name as invited_by_name,
    i.expires_at,
    (i.expires_at > now() and i.status = 'pending') as is_valid
  from invitations i
  join companies c on i.company_id = c.id
  left join users u on i.invited_by = u.id -- Use left join in case inviter is deleted
  where i.token_hash = p_token
  limit 1;
end;
$$;
