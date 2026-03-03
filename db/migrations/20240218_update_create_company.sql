-- create_company RPC'sini user_settings tablosunu kullanacak şekilde güncelle
CREATE OR REPLACE FUNCTION create_company(company_name text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_company_id uuid;
BEGIN
  -- 1. Create Company
  INSERT INTO companies (name, status)
  VALUES (company_name, 'active')
  RETURNING id INTO new_company_id;

  -- 2. Add Member as Owner
  INSERT INTO members (user_id, company_id, role, status)   
  VALUES (auth.uid(), new_company_id, 'owner', 'active');   

  -- 3. Update Active Context (user_settings.active_company_id)
  -- users.company_id güncellemesi kademeli olarak bırakılacak, 
  -- ancak uyumluluk için şimdilik null set edilebilir veya bırakılabilir.
  
  INSERT INTO user_settings (user_id, active_company_id, updated_at)
  VALUES (auth.uid(), new_company_id, now())
  ON CONFLICT (user_id) DO UPDATE 
  SET active_company_id = EXCLUDED.active_company_id,
      updated_at = now();

  -- Opsiyonel: users tablosundaki legacy alanı da temizle veya güncelle
  UPDATE users SET company_id = new_company_id, role = 'owner' WHERE id = auth.uid();

  RETURN new_company_id;
END;
$$;
