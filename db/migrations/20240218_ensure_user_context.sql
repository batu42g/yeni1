-- Kullanıcının aktif şirket bağlamını (context) otomatik olarak doğrular veya başlatır.
-- Eğer kullanıcının company_id'si boşsa, dahil olduğu ilk aktif şirketi (alfabetik) seçer.
CREATE OR REPLACE FUNCTION ensure_user_context()
RETURNS TABLE (
    id uuid,
    company_id uuid,
    role text,
    full_name text,
    avatar_url text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    found_company_id uuid;
    found_role text;
BEGIN
    -- Mevcut profil durumunu al
    SELECT u.company_id, u.role INTO found_company_id, found_role
    FROM users u
    WHERE u.id = auth.uid();

    -- Eğer aktif şirket seçili değilse, üyeliği olan ilk şirketi bul
    IF found_company_id IS NULL THEN
        SELECT m.company_id, m.role INTO found_company_id, found_role
        FROM members m
        JOIN companies c ON c.id = m.company_id
        WHERE m.user_id = auth.uid()
          AND m.status = 'active'
          AND c.status = 'active'
        ORDER BY c.name ASC
        LIMIT 1;

        -- Eğer bir şirket bulunduysa, kullanıcının aktif bağlamını güncelle
        IF found_company_id IS NOT NULL THEN
            UPDATE users u
            SET company_id = found_company_id,
                role = found_role
            WHERE u.id = auth.uid();
        END IF;
    END IF;

    -- Güncel profil bilgilerini dön
    RETURN QUERY 
    SELECT u.id, u.company_id, u.role, u.full_name, u.avatar_url
    FROM users u
    WHERE u.id = auth.uid();
END;
$$;
