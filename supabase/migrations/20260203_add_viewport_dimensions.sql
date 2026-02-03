-- Add viewport dimensions columns to steps table
-- These store the browser window size when the click was captured
-- Used to calculate accurate click position overlay percentages

ALTER TABLE steps
ADD COLUMN IF NOT EXISTS viewport_width integer,
ADD COLUMN IF NOT EXISTS viewport_height integer;

COMMENT ON COLUMN steps.viewport_width IS 'Browser viewport width in pixels when click was captured';
COMMENT ON COLUMN steps.viewport_height IS 'Browser viewport height in pixels when click was captured';
