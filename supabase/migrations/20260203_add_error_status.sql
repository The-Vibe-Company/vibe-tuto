-- Add 'error' status to tutorials table CHECK constraint
-- This allows the /api/process endpoint to mark failed tutorials

ALTER TABLE tutorials DROP CONSTRAINT IF EXISTS tutorials_status_check;
ALTER TABLE tutorials ADD CONSTRAINT tutorials_status_check
  CHECK (status IN ('draft', 'processing', 'ready', 'error'));
