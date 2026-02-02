-- Create storage buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false);

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots', 'screenshots', false);

-- Storage policies for recordings bucket
-- Users can upload their own recordings
CREATE POLICY "Users can upload recordings"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own recordings
CREATE POLICY "Users can view their own recordings"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own recordings
CREATE POLICY "Users can update their own recordings"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own recordings
CREATE POLICY "Users can delete their own recordings"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'recordings'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage policies for screenshots bucket
-- Users can upload their own screenshots
CREATE POLICY "Users can upload screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can view their own screenshots
CREATE POLICY "Users can view their own screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can update their own screenshots
CREATE POLICY "Users can update their own screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Users can delete their own screenshots
CREATE POLICY "Users can delete their own screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'screenshots'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
