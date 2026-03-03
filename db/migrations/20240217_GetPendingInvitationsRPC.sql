-- Function to get pending invitations for the current user's email
create or replace function get_my_pending_invitations()
returns table (
  id uuid,
  company_name text,
  inviter_name text,
  role text,
  token text,
  sent_at timestamptz
)
security definer
language plpgsql
as $$
declare
  user_email text;
begin
  -- Get current user's email
  select email into user_email from auth.users where id = auth.uid();
  
  if user_email is null then
    return;
  end if;

  return query
  select 
    i.id,
    c.name as company_name,
    u.full_name as inviter_name,
    i.role,
    i.token_hash as token,
    i.created_at as sent_at
  from invitations i
  join companies c on i.company_id = c.id
  left join users u on i.invited_by = u.id
  where i.email = user_email
  and i.status = 'pending'
  and i.expires_at > now();
end;
$$;
