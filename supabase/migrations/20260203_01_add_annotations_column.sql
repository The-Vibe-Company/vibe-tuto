-- Add annotations column to steps table
-- This column stores annotation data (circles, arrows, text, etc.) as JSONB

ALTER TABLE public.steps
ADD COLUMN IF NOT EXISTS annotations JSONB DEFAULT NULL;

-- Add a comment describing the column
COMMENT ON COLUMN public.steps.annotations IS 'Stores annotation data for screenshot markup (circles, arrows, text, highlights, blur regions)';
