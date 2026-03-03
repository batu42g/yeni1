-- Restore Company Script
-- Usage: Replace 'YOUR_COMPANY_ID' with the actual ID.

UPDATE companies
SET status = 'active', deleted_at = NULL
WHERE id = 'YOUR_COMPANY_ID';

-- Also activate members
UPDATE members
SET status = 'active'
WHERE company_id = 'YOUR_COMPANY_ID' AND status = 'archived';
