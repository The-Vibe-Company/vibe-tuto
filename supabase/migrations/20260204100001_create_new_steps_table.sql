-- Migration: Create new steps table for authored tutorial content
-- Steps reference sources (optional) and contain the edited content

-- Step 1: Create the new steps table
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE,
  source_id UUID REFERENCES sources(id) ON DELETE SET NULL,
  order_index INTEGER NOT NULL,
  text_content TEXT,
  step_type TEXT CHECK (step_type IN ('image', 'text', 'heading', 'divider')) DEFAULT 'text',
  annotations JSONB DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 2: Create indexes for performance
CREATE INDEX idx_steps_tutorial_id ON steps(tutorial_id);
CREATE INDEX idx_steps_order_index ON steps(tutorial_id, order_index);
CREATE INDEX idx_steps_source_id ON steps(source_id);

-- Step 3: Enable Row Level Security
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- Step 4: Create RLS policies
CREATE POLICY "Users can view steps of their tutorials"
  ON steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create steps for their tutorials"
  ON steps FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update steps of their tutorials"
  ON steps FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete steps of their tutorials"
  ON steps FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

-- Add comment to describe the table
COMMENT ON TABLE steps IS 'Authored tutorial steps that reference captured sources';
COMMENT ON COLUMN steps.source_id IS 'Optional reference to a captured source (screenshot)';
COMMENT ON COLUMN steps.step_type IS 'Type of step: image (with source), text, heading, or divider';
COMMENT ON COLUMN steps.annotations IS 'Annotation data for screenshot markup (circles, arrows, text, etc.)';
