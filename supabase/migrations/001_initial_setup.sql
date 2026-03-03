-- ============================================================
-- CRMPanel Multi-Tenant Database Setup
-- Supabase PostgreSQL Migration
-- ============================================================

-- 1. Companies Table
CREATE TABLE IF NOT EXISTS public.companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Users Table (linked to auth.users)
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'staff' CHECK (role IN ('admin', 'staff')),
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Customers Table
CREATE TABLE IF NOT EXISTS public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'lead' CHECK (status IN ('lead', 'active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Projects Table
CREATE TABLE IF NOT EXISTS public.projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
  budget NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 5. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 6. Offers Table
CREATE TABLE IF NOT EXISTS public.offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_users_company ON public.users(company_id);
CREATE INDEX IF NOT EXISTS idx_customers_company ON public.customers(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_company ON public.projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer ON public.projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company ON public.tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_offers_company ON public.offers(company_id);
CREATE INDEX IF NOT EXISTS idx_offers_customer ON public.offers(customer_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;

-- Helper function: get current user's company_id
CREATE OR REPLACE FUNCTION public.get_user_company_id()
RETURNS UUID AS $$
  SELECT company_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- Helper function: get current user's role
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid()
$$ LANGUAGE SQL SECURITY DEFINER STABLE;

-- *** Companies Policies ***
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  USING (id = public.get_user_company_id());

CREATE POLICY "Users can insert companies (registration)"
  ON public.companies FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Admins can update their company"
  ON public.companies FOR UPDATE
  USING (id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- *** Users Policies ***
CREATE POLICY "Users can view company members"
  ON public.users FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert their own profile"
  ON public.users FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile"
  ON public.users FOR UPDATE
  USING (id = auth.uid());

-- *** Customers Policies ***
CREATE POLICY "Users can view company customers"
  ON public.customers FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Users can insert customers"
  ON public.customers FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update company customers"
  ON public.customers FOR UPDATE
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can delete company customers"
  ON public.customers FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- *** Projects Policies ***
CREATE POLICY "Users can view company projects"
  ON public.projects FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can insert projects"
  ON public.projects FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can update projects"
  ON public.projects FOR UPDATE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete projects"
  ON public.projects FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- *** Tasks Policies ***
-- Admin: sees all tasks in company
-- Staff: sees only their assigned tasks
CREATE POLICY "Admin can view all company tasks"
  ON public.tasks FOR SELECT
  USING (
    company_id = public.get_user_company_id()
    AND (public.get_user_role() = 'admin' OR assigned_to = auth.uid())
  );

CREATE POLICY "Users can insert tasks"
  ON public.tasks FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id());

CREATE POLICY "Users can update tasks"
  ON public.tasks FOR UPDATE
  USING (
    company_id = public.get_user_company_id()
    AND (public.get_user_role() = 'admin' OR assigned_to = auth.uid())
  );

CREATE POLICY "Admins can delete tasks"
  ON public.tasks FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- *** Offers Policies ***
CREATE POLICY "Users can view company offers"
  ON public.offers FOR SELECT
  USING (company_id = public.get_user_company_id());

CREATE POLICY "Admins can insert offers"
  ON public.offers FOR INSERT
  WITH CHECK (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can update offers"
  ON public.offers FOR UPDATE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

CREATE POLICY "Admins can delete offers"
  ON public.offers FOR DELETE
  USING (company_id = public.get_user_company_id() AND public.get_user_role() = 'admin');

-- ============================================================
-- ENABLE REALTIME for Tasks
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
