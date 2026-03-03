BEGIN;

-- 1. users.company_id alanına açıklama ekle ve kısıtla
COMMENT ON COLUMN users.company_id IS 'DEPRECATED: Use user_settings.active_company_id instead. DO NOT USE in application logic.';
COMMENT ON COLUMN users.role IS 'DEPRECATED: Use members table for roles per company. DO NOT USE in application logic.';

-- 2. SECURITY DEFINER hardening for existing functions
-- Geçmişte oluşturduğumuz kritik fonksiyonları daha güvenli hale getiriyoruz

ALTER FUNCTION ensure_user_context() SET search_path = public;
ALTER FUNCTION create_company(text) SET search_path = public;
ALTER FUNCTION accept_invitation(text, uuid, text) SET search_path = public;

-- 3. Audit Log Tablosu (Zaten varsa üzerinden geçiyoruz, yoksa context switch ekliyoruz)
-- Bu sisteme özel "context switch" aksiyonunu audit_logs'a eklemek için bir yardımcı fonksiyon veya trigger düşünülebilir.
-- Şimdilik manuel log kaydı için bir RPC ekleyelim.

CREATE OR REPLACE FUNCTION log_context_switch(p_company_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO audit_logs (
    user_id,
    company_id,
    action,
    entity_type,
    entity_id,
    details
  ) VALUES (
    auth.uid(),
    p_company_id,
    'USER_CONTEXT_SWITCHED',
    'user_settings',
    auth.uid(),
    jsonb_build_object('switched_to_company_id', p_company_id, 'timestamp', now())
  );
END;
$$;

COMMIT;
