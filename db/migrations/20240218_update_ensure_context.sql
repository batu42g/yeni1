-- ensure_user_context RPC'sini user_settings tablosunu kullanacak şekilde güncelle
CREATE OR REPLACE FUNCTION ensure_user_context()
RETURNS TABLE (
    id uuid,
    active_company_id uuid,
    role text,
    full_name text,
    avatar_url text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    found_company_id uuid;
    found_role text;
BEGIN
    -- 1. user_settings tablosundan mevcut aktif şirketi al
    SELECT us.active_company_id INTO found_company_id
    FROM user_settings us
    WHERE us.user_id = auth.uid();

    -- Eğer kayıt yoksa, oluştur (Bootstrap)
    IF NOT FOUND THEN
        INSERT INTO user_settings (user_id) VALUES (auth.uid());
    END IF;

    -- 2. Eğer aktif şirket seçili değilse veya artık geçerli değilse (üyelik bittiyse vb.)
    -- geçerli bir üyelik bulalım (alfabetik ilk şirket)
    IF found_company_id IS NULL OR NOT EXISTS (
        SELECT 1 FROM members m 
        JOIN companies c ON c.id = m.company_id
        WHERE m.user_id = auth.uid() 
          AND m.company_id = found_company_id 
          AND m.status = 'active'
          AND c.status = 'active'
    ) THEN
        SELECT m.company_id, m.role INTO found_company_id, found_role
        FROM members m
        JOIN companies c ON c.id = m.company_id
        WHERE m.user_id = auth.uid()
          AND m.status = 'active'
          AND c.status = 'active'
        ORDER BY c.name ASC
        LIMIT 1;

        -- Yeni bağlamı kaydet
        UPDATE user_settings
        SET active_company_id = found_company_id,
            updated_at = now()
        WHERE user_id = auth.uid();
    ELSE
        -- Mevcut bağlam geçerliyse, o şirketteki rolü çekelim
        SELECT m.role INTO found_role
        FROM members m
        WHERE m.user_id = auth.uid() 
          AND m.company_id = found_company_id
          AND m.status = 'active';
    END IF;

    -- 3. Güncel profil bilgilerini dön (Uygulama artık user_settings bilgisini baz alacak)
    RETURN QUERY 
    SELECT u.id, us.active_company_id, found_role, u.full_name, u.avatar_url
    FROM users u
    JOIN user_settings us ON us.user_id = u.id
    WHERE u.id = auth.uid();
END;
$$;
