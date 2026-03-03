-- Yeni Nesil Audit & Activity Migration
-- 1. DROP old audit_logs securely
DROP TABLE IF EXISTS public.audit_logs CASCADE;

-- 2. CREATE audit_logs (Immutable)
CREATE TABLE public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid null references auth.users(id) ON DELETE SET NULL,
  actor_membership_id uuid null,
  actor_role text null,
  action text not null,
  target_type text not null,
  target_id uuid null,
  ip inet null,
  user_agent text null,
  request_id uuid null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

CREATE INDEX idx_audit_logs_company_created ON public.audit_logs (company_id, created_at DESC);
CREATE INDEX idx_audit_logs_company_action ON public.audit_logs (company_id, action, created_at DESC);
CREATE INDEX idx_audit_logs_company_target ON public.audit_logs (company_id, target_type, target_id);
CREATE INDEX idx_audit_logs_request_id ON public.audit_logs (request_id);

CREATE OR REPLACE FUNCTION public.deny_audit_update()
RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs entries cannot be modified or deleted';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_immutable_before_update
BEFORE UPDATE OR DELETE ON public.audit_logs
FOR EACH ROW EXECUTE FUNCTION public.deny_audit_update();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users" ON public.audit_logs FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable select for company members" ON public.audit_logs FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.members WHERE user_id = auth.uid() AND status = 'active')
);

-- 3. CREATE activity_events
CREATE TABLE public.activity_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) ON DELETE CASCADE,
  actor_user_id uuid null references auth.users(id) ON DELETE SET NULL,
  event_type text not null,
  title text not null,
  summary text null,
  entity_type text null,
  entity_id uuid null,
  severity text not null default 'info',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamp not null default now()
);

CREATE INDEX idx_activity_events_company_created ON public.activity_events (company_id, created_at DESC);
CREATE INDEX idx_activity_events_company_event ON public.activity_events (company_id, event_type, created_at DESC);
CREATE INDEX idx_activity_events_company_entity ON public.activity_events (company_id, entity_type, entity_id);

ALTER TABLE public.activity_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable insert for authenticated users" ON public.activity_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Enable select for company members" ON public.activity_events FOR SELECT USING (
    company_id IN (SELECT company_id FROM public.members WHERE user_id = auth.uid() AND status = 'active')
);
