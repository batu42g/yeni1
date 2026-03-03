BEGIN;

-- 1. user_settings tablosunu oluştur (Aktif Bağlam Yönetimi için)
CREATE TABLE IF NOT EXISTS user_settings (
    user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    active_company_id uuid REFERENCES companies(id) ON DELETE SET NULL,
    updated_at timestamptz DEFAULT now()
);

-- RLS etkinleştir
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Kullanıcı sadece kendi ayarlarını görebilir ve güncelleyebilir
CREATE POLICY "Users can manage their own settings" 
ON user_settings 
FOR ALL 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. Mevcut kullanıcıları user_settings tablosuna taşı (Bootstrap)
INSERT INTO user_settings (user_id, active_company_id)
SELECT id, company_id 
FROM users
ON CONFLICT (user_id) DO UPDATE 
SET active_company_id = EXCLUDED.active_company_id;

-- 3. Index'leri oluştur
CREATE INDEX IF NOT EXISTS idx_user_settings_active_company ON user_settings(active_company_id);
CREATE INDEX IF NOT EXISTS idx_members_user_status ON members(user_id, status);
CREATE INDEX IF NOT EXISTS idx_members_company_status ON members(company_id, status);

COMMIT;
