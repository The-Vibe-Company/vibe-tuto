-- Enable Row Level Security on tutorials
ALTER TABLE tutorials ENABLE ROW LEVEL SECURITY;

-- Tutorials policies: Users can only access their own tutorials
CREATE POLICY "Users can view their own tutorials"
  ON tutorials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own tutorials"
  ON tutorials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tutorials"
  ON tutorials FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tutorials"
  ON tutorials FOR DELETE
  USING (auth.uid() = user_id);

-- Enable Row Level Security on steps
ALTER TABLE steps ENABLE ROW LEVEL SECURITY;

-- Steps policies: Users can only access steps of their own tutorials
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
