-- Migration: Add storage policies for public screenshot access
-- This allows anyone to view screenshots of shared tutorials

-- Step 1: Create function to check if a screenshot belongs to a shared tutorial
-- Path format: {user_id}/{tutorial_id}/{filename}.png
CREATE OR REPLACE FUNCTION public.is_shared_screenshot(screenshot_path TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  tutorial_visibility TEXT;
  path_parts TEXT[];
  user_id_str TEXT;
  tutorial_id_str TEXT;
BEGIN
  -- Split the path into parts
  path_parts := string_to_array(screenshot_path, '/');

  -- Need at least 2 parts: user_id/tutorial_id
  IF array_length(path_parts, 1) < 2 THEN
    RETURN false;
  END IF;

  user_id_str := path_parts[1];
  tutorial_id_str := path_parts[2];

  -- Check if the tutorial is shared
  SELECT visibility INTO tutorial_visibility
  FROM tutorials
  WHERE id = tutorial_id_str::UUID
    AND user_id = user_id_str::UUID;

  -- Return true if visibility is link_only or public
  RETURN COALESCE(tutorial_visibility IN ('link_only', 'public'), false);
EXCEPTION
  WHEN OTHERS THEN
    -- If any error (invalid UUID, etc.), return false
    RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 2: Add storage policy for public screenshot access
-- Anyone can view screenshots of shared tutorials (no auth required)
CREATE POLICY "Anyone can view screenshots of shared tutorials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots'
    AND public.is_shared_screenshot(name)
  );

-- Step 3: Add comment
COMMENT ON FUNCTION public.is_shared_screenshot IS 'Checks if a screenshot path belongs to a tutorial with link_only or public visibility';
