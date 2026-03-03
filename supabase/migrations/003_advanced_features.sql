-- ============================================================
-- 003: Advanced Features Migration (RESET & RECREATE)
-- WARNING: THIS WILL DROP existing advanced tables to ensure schema consistency
-- Use the Supabase SQL Editor to run this script.
-- ============================================================

-- 0. HELPER TYPES & FUNCTIONS
-- Create Enum for User Roles if not exists
DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Helper types
DO $$ BEGIN
    CREATE TYPE userrole AS ENUM ('admin', 'staff');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- NOTE: public.get_user_company_id() and public.get_user_role() 
-- already exist in the schema and are used by strict RLS policies. 
-- We will use the existing definitions instead of redefining them.

-- Clean up existing objects to prevent conflicts
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.invitations CASCADE;
DROP TABLE IF EXISTS public.project_files CASCADE;
DROP FUNCTION IF EXISTS public.get_invitation_by_token CASCADE;
DROP FUNCTION IF EXISTS public.accept_invitation CASCADE;

-- 1. AUDIT LOGS TABLE
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL CHECK (action_type IN ('CREATE', 'UPDATE', 'DELETE', 'RESTORE')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('customer', 'project', 'task', 'offer', 'invitation')),
  entity_id TEXT NOT NULL, -- Flexible ID (can be UUID or string like email)
  description TEXT,
  old_value JSONB,
  new_value JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_audit_logs_company ON public.audit_logs(company_id);
CREATE INDEX idx_audit_logs_entity ON public.audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created ON public.audit_logs(created_at DESC);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company audit logs"
  ON public.audit_logs FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert audit logs"
  ON public.audit_logs FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

-- 2. SOFT DELETE COLUMNS (Idempotent)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'customers' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.customers ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.projects ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.tasks ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'offers' AND column_name = 'deleted_at') THEN
    ALTER TABLE public.offers ADD COLUMN deleted_at TIMESTAMPTZ DEFAULT NULL;
  END IF;
END $$;

-- 3. INVITATIONS TABLE
CREATE TABLE public.invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  role userrole NOT NULL DEFAULT 'staff',
  token TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(32), 'hex'),
  invited_by UUID NOT NULL REFERENCES public.users(id),
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '7 days'),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_invitations_company ON public.invitations(company_id);
CREATE INDEX idx_invitations_token ON public.invitations(token);

ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view company invitations"
  ON public.invitations FOR SELECT
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can create invitations"
  ON public.invitations FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete invitations"
  ON public.invitations FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- 4. PROJECT FILES TABLE
CREATE TABLE public.project_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES public.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_project_files_project ON public.project_files(project_id);

ALTER TABLE public.project_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company project files"
  ON public.project_files FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can upload project files"
  ON public.project_files FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete project files"
  ON public.project_files FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- 5. FUNCTION: Get Invitation Details (Public)
CREATE OR REPLACE FUNCTION public.get_invitation_by_token(p_token TEXT)
RETURNS TABLE (
  email TEXT,
  company_name TEXT,
  role userrole,
  is_valid BOOLEAN
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    i.email,
    c.name as company_name,
    i.role,
    (i.expires_at > now() AND i.accepted_at IS NULL)::BOOLEAN as is_valid
  FROM public.invitations i
  JOIN public.companies c ON c.id = i.company_id
  WHERE i.token = p_token;
END;
$$;

-- 6. FUNCTION: Accept Invitation
CREATE OR REPLACE FUNCTION public.accept_invitation(
  p_token TEXT,
  p_user_id UUID,
  p_full_name TEXT
)
RETURNS JSONB
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql
AS $$
DECLARE
  v_invite RECORD;
  v_company_id UUID;
BEGIN
  -- Get invitation
  SELECT * INTO v_invite
  FROM public.invitations
  WHERE token = p_token
    AND expires_at > now()
    AND accepted_at IS NULL;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'message', 'Geçersiz veya süresi dolmuş davet.');
  END IF;

  v_company_id := v_invite.company_id;

  -- Create public user profile
  -- Note: p_user_id should match auth.uid() ideally, but we trust the caller (server action or authenticated client)
  -- Since this is SECURITY DEFINER, we can insert into users table properly
  INSERT INTO public.users (id, company_id, role, full_name)
  VALUES (p_user_id, v_company_id, v_invite.role, p_full_name);

  -- Mark invitation as accepted
  UPDATE public.invitations
  SET accepted_at = now()
  WHERE id = v_invite.id;

  RETURN json_build_object('success', true, 'company_id', v_company_id);
EXCEPTION WHEN OTHERS THEN
  RETURN json_build_object('success', false, 'message', SQLERRM);
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_invitation_by_token(TEXT) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_invitation(TEXT, UUID, TEXT) TO authenticated, anon; 

-- 7. USERS TABLE POLICIES (Update visibility)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view company members" ON public.users;
CREATE POLICY "Users can view company members"
  ON public.users FOR SELECT
  USING (company_id = public.get_user_company_id());

DROP POLICY IF EXISTS "Users can view own profile" ON public.users;
CREATE POLICY "Users can view own profile"
  ON public.users FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
CREATE POLICY "Users can update own profile"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- 8. STORAGE BUCKET setup (Best effort)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-files', 'project-files', false) 
ON CONFLICT (id) DO NOTHING;
