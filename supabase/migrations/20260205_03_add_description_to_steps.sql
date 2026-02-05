-- Add description column to steps table for detailed explanations
-- This field stores optional long-form content shown below screenshots

ALTER TABLE steps ADD COLUMN description TEXT;

COMMENT ON COLUMN steps.description IS 'Optional detailed explanation shown below the screenshot';
