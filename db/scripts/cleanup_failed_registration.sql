-- ⚠️ DİKKAT: Bu kod, belirttiğiniz e-posta adresine sahip kullanıcıyı TAMAMEN SİLER.
-- Sadece kaydı yarım kalan ve tekrar denemek istediğiniz test hesabı için kullanın.

DO $$
DECLARE
  -- 👇 SİLMEK İSTEDİĞİNİZ E-POSTA ADRESİNİ AŞAĞIYA YAZIN
  target_email text := '23480297@stu.omu.edu.tr'; 
  
  target_user_id uuid;
BEGIN
  -- User ID'yi bul
  SELECT id INTO target_user_id FROM auth.users WHERE email = target_email;

  IF target_user_id IS NOT NULL THEN
    -- 1. Davetiyeleri temizle
    DELETE FROM invitations WHERE email = target_email;

    -- 2. Public profilini sil (Varsa)
    DELETE FROM public.users WHERE id = target_user_id;
    
    -- 3. Auth kullanıcısını sil (En önemlisi bu)
    DELETE FROM auth.users WHERE id = target_user_id;
    
    RAISE NOTICE 'Kullanıcı ve ilişkili veriler başarıyla silindi: %', target_email;
  ELSE
    RAISE NOTICE 'Kullanıcı bulunamadı: %. E-posta adresini doğru yazdığınızdan emin olun.', target_email;
  END IF;
END $$;
