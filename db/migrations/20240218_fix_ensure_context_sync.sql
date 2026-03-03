-- ensure_user_context RPC'sini user_settings tablosunu kullanacak şekilde güncelle
CREATE OR REPLACE FUNCTION ensure_user_context()
RETURNS TABLE (
    id uuid,
    active_company_id uuid,
    role text,
    full_name text,
    avatar_url text
) LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
        IF found_company_id IS NOT NULL THEN
            UPDATE user_settings
            SET active_company_id = found_company_id,
                updated_at = now()
            WHERE user_id = auth.uid();

            -- Legacy sync: users tablosunu da güncelle ki frontend fallback'leri çalışsın
            UPDATE users 
            SET company_id = found_company_id,
                role = found_role
            WHERE id = auth.uid();
        END IF;
    ELSE
        -- Mevcut bağlam geçerliyse, o şirketteki rolü çekelim
        SELECT m.role INTO found_role
        FROM members m
        WHERE m.user_id = auth.uid() 
          AND m.company_id = found_company_id 
          AND m.status = 'active';
          
        -- Legacy sync: Bağlam geçerliyse bile users tablosundaki rolü kontrol edelim
        UPDATE users 
        SET role = found_role 
        WHERE id = auth.uid() AND (role IS NULL OR role != found_role);
    END IF;

    -- 3. Güncel profil bilgilerini dön
    RETURN QUERY 
    SELECT u.id, us.active_company_id, m.role, u.full_name, u.avatar_url
    FROM users u
    JOIN user_settings us ON us.user_id = u.id
    LEFT JOIN members m ON m.user_id = u.id AND m.company_id = us.active_company_id AND m.status = 'active'
    WHERE u.id = auth.uid();
END;
$$;
