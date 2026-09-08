-- Shared guides are served through token/slug-checked server routes. Original
-- captures, metadata and annotations must remain owner-only, including blurred areas.
DROP POLICY IF EXISTS "Anyone can view shared tutorials" ON public.tutorials;
DROP POLICY IF EXISTS "Anyone can view sources of shared tutorials" ON public.sources;
DROP POLICY IF EXISTS "Anyone can view steps of shared tutorials" ON public.steps;
DROP POLICY IF EXISTS "Anyone can view screenshots of shared tutorials" ON storage.objects;
-- Owner policies remain unchanged. Server rendering requires SERVICE_ROLE_KEY.
