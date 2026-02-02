-- Create steps table
CREATE TABLE steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tutorial_id UUID REFERENCES tutorials(id) ON DELETE CASCADE,
  order_index INTEGER NOT NULL,
  screenshot_url TEXT,
  text_content TEXT,
  timestamp_start FLOAT,
  timestamp_end FLOAT,
  click_x INTEGER,
  click_y INTEGER,
  click_type TEXT CHECK (click_type IN ('click', 'navigation')),
  url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on tutorial_id for faster joins
CREATE INDEX idx_steps_tutorial_id ON steps(tutorial_id);

-- Create index on order_index for sorting
CREATE INDEX idx_steps_order_index ON steps(tutorial_id, order_index);
