-- Soft Delete Columns
ALTER TABLE customers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;
ALTER TABLE offers ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_customers_deleted_at ON customers(deleted_at);
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at);
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
CREATE INDEX IF NOT EXISTS idx_offers_deleted_at ON offers(deleted_at);
