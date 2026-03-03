-- accept_invitation RPC'sini user_settings tablosunu kullanacak şekilde güncelle
CREATE OR REPLACE FUNCTION accept_invitation(
    p_token text,
    p_user_id uuid,
    p_full_name text
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    v_invitation_id uuid;
    v_company_id uuid;
    v_role text;
BEGIN
    -- 1. Get and validate invitation
    SELECT id, company_id, role INTO v_invitation_id, v_company_id, v_role
    FROM invitations
    WHERE token = p_token AND status = 'pending' AND (expires_at > now() OR expires_at IS NULL);

    IF v_invitation_id IS NULL THEN
        RAISE EXCEPTION 'Davet geçersiz, süresi dolmuş veya zaten kullanılmış.';
    END IF;

    -- 2. Add as member (or update if previously removed)
    INSERT INTO members (user_id, company_id, role, status)
    VALUES (p_user_id, v_company_id, v_role, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE
    SET status = 'active', role = v_role, updated_at = now();

    -- 3. Update invitation status
    UPDATE invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation_id;

    -- 4. Update Active Context (Eğer kullanıcının şu an aktif bir şirketi yoksa bu yeni şirketi aktif yapalım)
    INSERT INTO user_settings (user_id, active_company_id, updated_at)
    VALUES (p_user_id, v_company_id, now())
    ON CONFLICT (user_id) DO UPDATE
    SET active_company_id = COALESCE(user_settings.active_company_id, EXCLUDED.active_company_id),
        updated_at = now();

    -- 5. Update user profile if needed (full_name)
    UPDATE users SET full_name = p_full_name WHERE id = p_user_id AND (full_name IS NULL OR full_name = '');

END;
$$;
