-- Ensure get_invitation_by_token RPC is correct and unambiguous
-- Also adds inviter_email to the return for better UI debugging if needed

create or replace function get_invitation_by_token(p_token text)
returns table (
  id uuid,
  company_id uuid,
  company_name text,
  email text, -- This is the INVITED email (target)
  role text,
  invited_by uuid,
  invited_by_name text,
  inviter_email text, -- Added for context
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
    i.email, -- Explicitly from invitations table
    i.role::text, 
    i.invited_by,
    u.full_name as invited_by_name,
    u.email as inviter_email, -- Admin's email
    i.expires_at,
    (i.expires_at > now() and i.status = 'pending') as is_valid
  from invitations i
  join companies c on i.company_id = c.id
  left join users u on i.invited_by = u.id
  where i.token_hash = p_token
  limit 1;
end;
$$;
