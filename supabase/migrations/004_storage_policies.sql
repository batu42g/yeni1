-- Storage Policies for 'project-files' bucket
-- This fixes the "new row violates row-level security policy" error during upload

-- 1. Create Policy for INSERT (Upload)
-- Allow any authenticated user to upload files to the 'project-files' bucket
DROP POLICY IF EXISTS "Authenticated users can upload project files" ON storage.objects;
CREATE POLICY "Authenticated users can upload project files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'project-files');

-- 2. Create Policy for SELECT (View/Download)
-- Allow any authenticated user to view files in the 'project-files' bucket
DROP POLICY IF EXISTS "Authenticated users can view project files" ON storage.objects;
CREATE POLICY "Authenticated users can view project files"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'project-files');

-- 3. Create Policy for DELETE
-- Allow any authenticated user (or owner) to delete files in the 'project-files' bucket
DROP POLICY IF EXISTS "Authenticated users can delete project files" ON storage.objects;
CREATE POLICY "Authenticated users can delete project files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'project-files');

-- 4. Create Policy for UPDATE (rarely used for files, but good to have for metadata)
DROP POLICY IF EXISTS "Authenticated users can update project files" ON storage.objects;
CREATE POLICY "Authenticated users can update project files"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'project-files');
