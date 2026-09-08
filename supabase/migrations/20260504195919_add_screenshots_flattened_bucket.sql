-- Migration: Add the `screenshots-flattened` bucket. Public share images are
-- rendered with annotations (blur, highlights, callouts...) baked in and
-- written here. Raw originals stay in the `screenshots` bucket and are no
-- longer exposed in share links.
--
-- Path layout mirrors the source bucket: `{user_id}/{tutorial_id}/...`,
-- so the existing `is_shared_screenshot` helper works unchanged.

INSERT INTO storage.buckets (id, name, public)
VALUES ('screenshots-flattened', 'screenshots-flattened', false)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read flattened screenshots that belong to a shared tutorial.
-- Reuses the helper introduced in 20260204100003_add_public_storage_access.sql.
CREATE POLICY "Anyone can view flattened screenshots of shared tutorials"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots-flattened'
    AND public.is_shared_screenshot(name)
  );

-- Owners can read their own flattened screenshots (debugging, future features).
CREATE POLICY "Users can view their own flattened screenshots"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'screenshots-flattened'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- INSERT/UPDATE/DELETE go through the service-role key (no user-facing writes),
-- which bypasses RLS. We still scope user writes for safety in case the key
-- changes.
CREATE POLICY "Users can upload their own flattened screenshots"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'screenshots-flattened'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can update their own flattened screenshots"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'screenshots-flattened'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete their own flattened screenshots"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'screenshots-flattened'
    AND auth.uid() IS NOT NULL
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
