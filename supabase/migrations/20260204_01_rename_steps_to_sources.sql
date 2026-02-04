-- Migration: Rename steps table to sources
-- This separates raw captured data (sources) from authored content (steps)

-- Step 1: Rename the table
ALTER TABLE steps RENAME TO sources;

-- Step 2: Rename indexes
ALTER INDEX IF EXISTS idx_steps_tutorial_id RENAME TO idx_sources_tutorial_id;
ALTER INDEX IF EXISTS idx_steps_order_index RENAME TO idx_sources_order_index;

-- Step 3: Rename constraints (if any)
ALTER TABLE sources RENAME CONSTRAINT steps_click_type_check TO sources_click_type_check;

-- Step 4: Drop old RLS policies and create new ones for sources
DROP POLICY IF EXISTS "Users can view steps of their tutorials" ON sources;
DROP POLICY IF EXISTS "Users can create steps for their tutorials" ON sources;
DROP POLICY IF EXISTS "Users can update steps of their tutorials" ON sources;
DROP POLICY IF EXISTS "Users can delete steps of their tutorials" ON sources;

-- Create new RLS policies for sources table
CREATE POLICY "Users can view sources of their tutorials"
  ON sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create sources for their tutorials"
  ON sources FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update sources of their tutorials"
  ON sources FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete sources of their tutorials"
  ON sources FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.user_id = auth.uid()
    )
  );
