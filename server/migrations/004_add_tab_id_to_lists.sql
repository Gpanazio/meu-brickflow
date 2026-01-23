-- Add tab_id column to lists table
ALTER TABLE lists ADD COLUMN IF NOT EXISTS tab_id TEXT;

-- Migrate existing data based on type
UPDATE lists SET tab_id = 'kanban' WHERE type = 'KANBAN' AND tab_id IS NULL;
UPDATE lists SET tab_id = 'todo' WHERE type = 'TODO' AND tab_id IS NULL;
UPDATE lists SET tab_id = 'goals' WHERE type = 'GOALS' AND tab_id IS NULL;

-- Default for new rows (optional, but good for safety)
-- ALTER TABLE lists ALTER COLUMN tab_id SET DEFAULT 'kanban';
