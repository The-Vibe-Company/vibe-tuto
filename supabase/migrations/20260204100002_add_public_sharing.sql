-- Migration: Add public sharing capabilities to tutorials
-- This allows tutorials to be shared via token (link_only) or slug (public)

-- Step 1: Add columns to tutorials table
ALTER TABLE tutorials ADD COLUMN is_public BOOLEAN DEFAULT false;
ALTER TABLE tutorials ADD COLUMN public_token TEXT UNIQUE;
ALTER TABLE tutorials ADD COLUMN visibility TEXT DEFAULT 'private'
  CHECK (visibility IN ('private', 'link_only', 'public'));
ALTER TABLE tutorials ADD COLUMN published_at TIMESTAMPTZ;

-- Step 2: Create indexes for fast lookups
CREATE INDEX idx_tutorials_public_token ON tutorials(public_token) WHERE public_token IS NOT NULL;
CREATE INDEX idx_tutorials_is_public ON tutorials(is_public) WHERE is_public = true;
CREATE INDEX idx_tutorials_slug_public ON tutorials(slug) WHERE is_public = true AND slug IS NOT NULL;
CREATE INDEX idx_tutorials_visibility ON tutorials(visibility) WHERE visibility != 'private';

-- Step 3: Add RLS policy for public access to tutorials
-- Anyone can view tutorials that are link_only or public
CREATE POLICY "Anyone can view shared tutorials"
  ON tutorials FOR SELECT
  USING (visibility IN ('link_only', 'public'));

-- Step 4: Add RLS policy for public access to sources
-- Anyone can view sources of shared tutorials
CREATE POLICY "Anyone can view sources of shared tutorials"
  ON sources FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = sources.tutorial_id
      AND tutorials.visibility IN ('link_only', 'public')
    )
  );

-- Step 5: Add RLS policy for public access to steps
-- Anyone can view steps of shared tutorials
CREATE POLICY "Anyone can view steps of shared tutorials"
  ON steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tutorials
      WHERE tutorials.id = steps.tutorial_id
      AND tutorials.visibility IN ('link_only', 'public')
    )
  );

-- Step 6: Add comments
COMMENT ON COLUMN tutorials.is_public IS 'Whether the tutorial is publicly accessible (link_only or public)';
COMMENT ON COLUMN tutorials.public_token IS 'Unique token for sharing via link (used in /t/{token} URLs)';
COMMENT ON COLUMN tutorials.visibility IS 'Visibility level: private (owner only), link_only (anyone with link), public (SEO-indexed)';
COMMENT ON COLUMN tutorials.published_at IS 'Timestamp when the tutorial was first made public';
