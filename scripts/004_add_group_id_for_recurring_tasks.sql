-- Add group_id column to support recurring task deletion logic
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS group_id UUID;

-- Create index for group_id for better performance when querying recurring tasks
CREATE INDEX IF NOT EXISTS idx_tasks_group_id ON tasks(group_id);
