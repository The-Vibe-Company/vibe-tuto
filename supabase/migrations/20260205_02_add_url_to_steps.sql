-- Add optional url field to steps table for navigation/tab_change steps
-- This allows storing and editing the URL independently from the source
ALTER TABLE steps ADD COLUMN IF NOT EXISTS url TEXT;
