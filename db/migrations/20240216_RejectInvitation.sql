create or replace function reject_invitation(p_token text)
returns void
security definer
language plpgsql
as $$
declare
  invite_record record;
begin
  -- First verify the invitation exists and is pending
  select * into invite_record
  from invitations
  where token_hash = p_token
  and status = 'pending';

  if not found then
    raise exception 'Invitation not found or not pending';
  end if;

  -- Update status
  update invitations
  set 
    status = 'rejected',
    accepted = false
  where id = invite_record.id;
  
  -- We could also log this action audit logs if we had the user context, 
  -- but rejection can be done by non-logged in users (actually no, usually you reject after seeing it).
  -- If user is logged in, we know who rejected. If not, it's anonymous rejection via token.
  
end;
$$;
