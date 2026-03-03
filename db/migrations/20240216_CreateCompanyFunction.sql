-- Function to create a new company for an existing user
create or replace function create_company(company_name text)
returns uuid
language plpgsql
security definer -- Runs with privileges of the function creator (admin), bypassing RLS
as $$
declare
  new_company_id uuid;
begin
  -- 1. Create Company
  insert into companies (name, status)
  values (company_name, 'active')
  returning id into new_company_id;

  -- 2. Add Member as Owner
  insert into members (user_id, company_id, role, status)
  values (auth.uid(), new_company_id, 'owner', 'active');

  -- 3. Update User Context (Switch to new company)
  update users
  set company_id = new_company_id,
      role = 'owner'
  where id = auth.uid();

  return new_company_id;
end;
$$;
