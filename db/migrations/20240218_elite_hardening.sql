BEGIN;

-- 1. SECURITY DEFINER Hardening (search_path eklenmesi)
CREATE OR REPLACE FUNCTION ensure_user_context()
RETURNS TABLE (
    id uuid,
    active_company_id uuid,
    role text,
    full_name text,
    avatar_url text
) 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Güvenlik hardening
AS $$
DECLARE
    found_company_id uuid;
    found_role text;
BEGIN
    SELECT us.active_company_id INTO found_company_id
    FROM user_settings us
    WHERE us.user_id = auth.uid();

    IF NOT FOUND THEN
        INSERT INTO user_settings (user_id) VALUES (auth.uid());
    END IF;

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

        UPDATE user_settings
        SET active_company_id = found_company_id,
            updated_at = now()
        WHERE user_id = auth.uid();
    ELSE
        SELECT m.role INTO found_role
        FROM members m
        WHERE m.user_id = auth.uid() 
          AND m.company_id = found_company_id
          AND m.status = 'active';
    END IF;

    RETURN QUERY 
    SELECT u.id, us.active_company_id, found_role, u.full_name, u.avatar_url
    FROM users u
    JOIN user_settings us ON us.user_id = u.id
    WHERE u.id = auth.uid();
END;
$$;

-- 2. CREATE_COMPANY hardening
CREATE OR REPLACE FUNCTION create_company(company_name text)
RETURNS uuid 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Güvenlik hardening
AS $$
DECLARE
  new_company_id uuid;
BEGIN
  INSERT INTO companies (name, status)
  VALUES (company_name, 'active')
  RETURNING id INTO new_company_id;

  INSERT INTO members (user_id, company_id, role, status)   
  VALUES (auth.uid(), new_company_id, 'owner', 'active');   
  
  INSERT INTO user_settings (user_id, active_company_id, updated_at)
  VALUES (auth.uid(), new_company_id, now())
  ON CONFLICT (user_id) DO UPDATE 
  SET active_company_id = EXCLUDED.active_company_id,
      updated_at = now();

  -- Legacy field sync (deprecated mark için tutuluyor)
  UPDATE users SET company_id = new_company_id, role = 'owner' WHERE id = auth.uid();

  -- Audit log kaydı (Active Context Audit Log)
  INSERT INTO audit_logs (company_id, user_id, action, entity_type, entity_id, details)
  VALUES (new_company_id, auth.uid(), 'COMPANY_CREATED', 'company', new_company_id, 
          jsonb_build_object('name', company_name));

  RETURN new_company_id;
END;
$$;

-- 3. ACCEPT_INVITATION hardening
CREATE OR REPLACE FUNCTION accept_invitation(
    p_token text,
    p_user_id uuid,
    p_full_name text
)
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public -- Güvenlik hardening
AS $$
DECLARE
    v_invitation_id uuid;
    v_company_id uuid;
    v_role text;
BEGIN
    SELECT id, company_id, role INTO v_invitation_id, v_company_id, v_role
    FROM invitations
    WHERE token = p_token AND status = 'pending' AND (expires_at > now() OR expires_at IS NULL);

    IF v_invitation_id IS NULL THEN
        RAISE EXCEPTION 'Davet geçersiz, süresi dolmuş veya zaten kullanılmış.';
    END IF;

    INSERT INTO members (user_id, company_id, role, status)
    VALUES (p_user_id, v_company_id, v_role, 'active')
    ON CONFLICT (user_id, company_id) DO UPDATE
    SET status = 'active', role = v_role, updated_at = now();

    UPDATE invitations
    SET status = 'accepted', accepted_at = now()
    WHERE id = v_invitation_id;

    INSERT INTO user_settings (user_id, active_company_id, updated_at)
    VALUES (p_user_id, v_company_id, now())
    ON CONFLICT (user_id) DO UPDATE
    SET active_company_id = COALESCE(user_settings.active_company_id, EXCLUDED.active_company_id),
        updated_at = now();

    UPDATE users SET full_name = p_full_name WHERE id = p_user_id AND (full_name IS NULL OR full_name = '');
END;
$$;

-- 4. Legacy Column Documentation
COMMENT ON COLUMN users.company_id IS 'DO NOT USE — legacy active context. Use user_settings.active_company_id instead.';
COMMENT ON COLUMN users.role IS 'DO NOT USE — legacy global role. Roles are now managed in members table per company.';

COMMIT;
