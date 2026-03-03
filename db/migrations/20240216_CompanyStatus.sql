-- Add status and deleted_at to companies table
ALTER TABLE companies 
ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Create index for faster filtering by status
CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status);
CREATE INDEX IF NOT EXISTS idx_companies_deleted_at ON companies(deleted_at);

-- Update RLS policies to exclude deleted companies (optional but recommended)
-- Note: Existing policies might need adjustment depending on requirements.
-- For now, we just add the columns.
