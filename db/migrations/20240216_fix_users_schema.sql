-- Fix Users Table Schema
-- The error "Could not find the 'email' column" indicates this column might be missing.

-- 1. Add email column safely
alter table users add column if not exists email text;
alter table users add column if not exists full_name text; -- Just in case

-- 2. Create index for performance
create index if not exists users_email_idx on users(email);

-- 3. Verify RLS policies accommodate the new column (Existing policies cover the whole row)
-- No changes needed for RLS.

-- 4. Reload Schema Cache (Supabase specific)
notify pgrst, 'reload schema';
