import { createHash } from 'node:crypto';
import type { Annotation } from '@/lib/types/editor';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderFlattened } from './render-step';

const SOURCE_BUCKET = 'screenshots';
const FLATTENED_BUCKET = 'screenshots-flattened';
const SIGNED_URL_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface FlattenInput {
  /** Path of the original screenshot in the `screenshots` bucket. */
  originalPath: string;
  /** Annotations to bake in (empty array → still renders, just a copy). */
  annotations: Annotation[];
}

/**
 * Stable hash of (originalPath, annotations). Different annotations on the
 * same source produce a different path, so updates invalidate transparently.
 * Old paths become orphans.
 */
export function computeFlattenedPath(input: FlattenInput): string {
  const hash = createHash('sha256')
    .update(input.originalPath)
    .update('\0')
    .update(JSON.stringify(input.annotations ?? []))
    .digest('hex')
    .slice(0, 16);
  // Mirror original layout `{user_id}/{tutorial_id}/...` so the RLS policy
  // (which inspects the first two path segments) keeps working.
  // Original: `{user_id}/{tutorial_id}/{filename}.png`
  // Flattened: `{user_id}/{tutorial_id}/{originalBase}-{hash}.png`
  const lastSlash = input.originalPath.lastIndexOf('/');
  const dir = lastSlash >= 0 ? input.originalPath.slice(0, lastSlash) : '';
  const file = lastSlash >= 0 ? input.originalPath.slice(lastSlash + 1) : input.originalPath;
  const base = file.replace(/\.[^.]+$/, '');
  return `${dir}/${base}-${hash}.png`;
}

async function objectExists(bucket: string, path: string): Promise<boolean> {
  const admin = createAdminClient();
  const lastSlash = path.lastIndexOf('/');
  const dir = lastSlash >= 0 ? path.slice(0, lastSlash) : '';
  const file = lastSlash >= 0 ? path.slice(lastSlash + 1) : path;
  const { data, error } = await admin.storage.from(bucket).list(dir, {
    limit: 1,
    search: file,
  });
  if (error) return false;
  return !!data?.some((entry) => entry.name === file);
}

/**
 * Render-and-upload, idempotent. If an object already exists at the cache
 * path, this is a no-op. Returns the flattened path on success, null on
 * failure (caller decides how to fall back).
 */
export async function flattenAndUpload(input: FlattenInput): Promise<string | null> {
  const flattenedPath = computeFlattenedPath(input);
  const admin = createAdminClient();

  if (await objectExists(FLATTENED_BUCKET, flattenedPath)) {
    return flattenedPath;
  }

  const { data: download, error: downloadError } = await admin.storage
    .from(SOURCE_BUCKET)
    .download(input.originalPath);
  if (downloadError || !download) {
    console.error('flatten: failed to download original', input.originalPath, downloadError);
    return null;
  }

  const originalBuffer = Buffer.from(await download.arrayBuffer());
  let pngBuffer: Buffer;
  try {
    pngBuffer = await renderFlattened(originalBuffer, input.annotations);
  } catch (err) {
    console.error('flatten: render failed', input.originalPath, err);
    return null;
  }

  const { error: uploadError } = await admin.storage
    .from(FLATTENED_BUCKET)
    .upload(flattenedPath, pngBuffer, {
      contentType: 'image/png',
      upsert: true,
    });
  if (uploadError) {
    console.error('flatten: failed to upload', flattenedPath, uploadError);
    return null;
  }

  return flattenedPath;
}

/**
 * Get a signed URL for the flattened version of (originalPath, annotations).
 * Renders + uploads on cache miss. Returns null if the pipeline fails — caller
 * should NOT fall back to the raw bucket URL (that would defeat the privacy
 * goal of the whole feature).
 */
export async function getFlattenedSignedUrl(input: FlattenInput): Promise<string | null> {
  const path = await flattenAndUpload(input);
  if (!path) return null;

  const admin = createAdminClient();
  const { data, error } = await admin.storage
    .from(FLATTENED_BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    console.error('flatten: failed to sign URL', path, error);
    return null;
  }
  return data.signedUrl;
}

/**
 * Eagerly flatten every step of a tutorial that has both a source screenshot
 * and a non-private parent. Errors on individual steps are logged and ignored
 * — the public route will retry lazily on first view.
 */
export async function flattenTutorial(tutorialId: string): Promise<void> {
  const admin = createAdminClient();

  const { data: steps, error } = await admin
    .from('steps')
    .select('id, annotations, sources(screenshot_url)')
    .eq('tutorial_id', tutorialId);
  if (error || !steps) {
    console.error('flatten: failed to list steps', tutorialId, error);
    return;
  }

  await Promise.all(
    steps.map(async (step) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const source = (step as any).sources as { screenshot_url: string | null } | null;
      if (!source?.screenshot_url) return;

      let annotations = (step as { annotations: unknown }).annotations;
      if (typeof annotations === 'string') {
        try {
          annotations = JSON.parse(annotations);
        } catch {
          annotations = [];
        }
      }
      if (!Array.isArray(annotations)) annotations = [];

      try {
        await flattenAndUpload({
          originalPath: source.screenshot_url,
          annotations: annotations as Annotation[],
        });
      } catch (err) {
        console.error('flatten: step failed', (step as { id: string }).id, err);
      }
    })
  );
}

/**
 * Flatten a single step by id. Used by the steps PATCH handler when annotations
 * change on a shared tutorial. Best-effort: returns silently on any failure.
 */
export async function flattenStepIfShared(stepId: string): Promise<void> {
  const admin = createAdminClient();
  const { data: step, error } = await admin
    .from('steps')
    .select('id, annotations, tutorial_id, sources(screenshot_url), tutorials!inner(visibility)')
    .eq('id', stepId)
    .single();
  if (error || !step) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tutorial = (step as any).tutorials as { visibility: string | null } | null;
  if (!tutorial || tutorial.visibility === 'private' || !tutorial.visibility) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const source = (step as any).sources as { screenshot_url: string | null } | null;
  if (!source?.screenshot_url) return;

  let annotations = (step as { annotations: unknown }).annotations;
  if (typeof annotations === 'string') {
    try {
      annotations = JSON.parse(annotations);
    } catch {
      annotations = [];
    }
  }
  if (!Array.isArray(annotations)) annotations = [];

  await flattenAndUpload({
    originalPath: source.screenshot_url,
    annotations: annotations as Annotation[],
  });
}
