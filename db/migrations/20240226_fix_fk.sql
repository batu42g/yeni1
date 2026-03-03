ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_user_id_fkey;
ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

ALTER TABLE public.activity_events DROP CONSTRAINT IF EXISTS activity_events_actor_user_id_fkey;
ALTER TABLE public.activity_events ADD CONSTRAINT activity_events_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Automatically reload schema cache
NOTIFY pgrst, 'reload schema';
