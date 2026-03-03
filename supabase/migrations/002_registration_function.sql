-- ============================================================
-- Registration Function (bypasses RLS for new user registration)
-- Run this in Supabase SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_registration(
  p_user_id UUID,
  p_company_name TEXT,
  p_full_name TEXT
)
RETURNS JSON AS $$
DECLARE
  v_company_id UUID;
  v_result JSON;
BEGIN
  -- 1. Create company
  INSERT INTO public.companies (name)
  VALUES (p_company_name)
  RETURNING id INTO v_company_id;

  -- 2. Create user profile linked to company
  INSERT INTO public.users (id, company_id, role, full_name)
  VALUES (p_user_id, v_company_id, 'admin', p_full_name);

  -- 3. Return result
  SELECT json_build_object(
    'company_id', v_company_id,
    'user_id', p_user_id,
    'success', true
  ) INTO v_result;

  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute to authenticated and anon users (needed during signup)
GRANT EXECUTE ON FUNCTION public.handle_registration TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_registration TO anon;
