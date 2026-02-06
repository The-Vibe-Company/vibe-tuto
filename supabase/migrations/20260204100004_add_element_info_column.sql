-- Add element_info column to steps table
-- Stores the DOM element information captured during click events
-- Used to auto-generate captions like "Click on Settings"

ALTER TABLE public.steps
ADD COLUMN IF NOT EXISTS element_info JSONB DEFAULT NULL;

COMMENT ON COLUMN public.steps.element_info IS 'Stores clicked element information (tag, text, id, className) for auto-generating captions';
