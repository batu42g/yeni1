-- 1. Update CHECK constraint for entity_type in audit_logs (Allow 'company')
-- Note: It was created as TEXT with CHECK constraint, not as an ENUM type.

DO $$ BEGIN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_entity_type_check;
    ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_entity_type_check 
        CHECK (entity_type IN ('customer', 'project', 'task', 'offer', 'invitation', 'company'));
EXCEPTION
    WHEN undefined_object THEN null; -- If table doesn't exist
END $$;

-- 2. Add logo_url to companies table
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;

-- 3. Create 'public-assets' bucket if not exists
INSERT INTO storage.buckets (id, name, public)
VALUES ('public-assets', 'public-assets', true)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage Policies for 'public-assets' (Branding logos)

-- Enable RLS (already enabled on storage.objects, but ensuring policies are set)

-- Allow public read access (for logos)
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING (bucket_id = 'public-assets');

-- Allow authenticated users to upload
DROP POLICY IF EXISTS "Authenticated users can upload public assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload public assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'public-assets');

-- Allow authenticated users to update/delete
DROP POLICY IF EXISTS "Authenticated users can update public assets" ON storage.objects;
CREATE POLICY "Authenticated users can update public assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'public-assets');

DROP POLICY IF EXISTS "Authenticated users can delete public assets" ON storage.objects;
CREATE POLICY "Authenticated users can delete public assets"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'public-assets');
