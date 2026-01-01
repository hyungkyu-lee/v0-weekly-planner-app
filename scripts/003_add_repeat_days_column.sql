-- Add repeat_days column for routine tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS repeat_days INTEGER[];

-- Add index for better query performance on repeat_days
CREATE INDEX IF NOT EXISTS idx_tasks_repeat_days ON tasks USING GIN(repeat_days);

-- Update RLS policies to handle repeat_days (no changes needed, just ensuring they work)
COMMENT ON COLUMN tasks.repeat_days IS 'Array of day numbers (0=Sunday, 1=Monday, etc.) for routine tasks';
