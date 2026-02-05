import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditorClient } from '@/components/editor/EditorClient';
import type { SourceWithSignedUrl, StepWithSignedUrl, Annotation, ElementInfo } from '@/lib/types/editor';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Get user from session (middleware already validated auth and redirects if not authenticated)
  // Using getSession() which reads from cookies (no network call) instead of getUser()
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Session is guaranteed by middleware, but fallback for safety
  if (!session?.user) {
    redirect('/login');
  }
  const user = session.user;

  // 2. Fetch tutorial
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .select('*')
    .eq('id', id)
    .single();

  if (tutorialError || !tutorial) {
    notFound();
  }

  // 3. Check ownership
  if (tutorial.user_id !== user.id) {
    redirect('/dashboard?error=access_denied');
  }

  // 4. Fetch sources and steps IN PARALLEL (they don't depend on each other)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sourcesResult, stepsResult] = await Promise.all([
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('sources')
      .select('*')
      .eq('tutorial_id', id)
      .order('order_index', { ascending: true }),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('steps')
      .select('*')
      .eq('tutorial_id', id)
      .order('order_index', { ascending: true }),
  ]);

  const sources = sourcesResult.data;
  const steps = stepsResult.data;

  if (sourcesResult.error) {
    console.error('Failed to fetch sources:', sourcesResult.error);
  }
  if (stepsResult.error) {
    console.error('Failed to fetch steps:', stepsResult.error);
  }

  // 5. Collect all screenshot paths that need signed URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const screenshotPaths: string[] = (sources || [])
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .filter((s: any) => s.screenshot_url)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .map((s: any) => s.screenshot_url);

  // Also add audio path
  const audioPath = `${tutorial.user_id}/${tutorial.id}.webm`;

  // 6. Generate ALL signed URLs in one parallel batch
  const [screenshotSignedUrls, audioSignedUrlResult] = await Promise.all([
    // Batch all screenshot signed URLs
    Promise.all(
      screenshotPaths.map(path =>
        supabase.storage.from('screenshots').createSignedUrl(path, 3600)
      )
    ),
    // Audio signed URL
    supabase.storage.from('recordings').createSignedUrl(audioPath, 3600),
  ]);

  // Build path -> signed URL map for screenshots
  const signedUrlMap = new Map<string, string>();
  screenshotPaths.forEach((path, index) => {
    const result = screenshotSignedUrls[index];
    if (result.data?.signedUrl) {
      signedUrlMap.set(path, result.data.signedUrl);
    }
  });

  // 7. Build sources with signed URLs
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sourcesWithSignedUrls: SourceWithSignedUrl[] = (sources || []).map((source: any) => {
    const signedScreenshotUrl = source.screenshot_url
      ? signedUrlMap.get(source.screenshot_url) || null
      : null;

    // Parse element_info from JSON if present
    const element_info = source.element_info
      ? (typeof source.element_info === 'string'
          ? JSON.parse(source.element_info)
          : source.element_info as ElementInfo)
      : null;

    return {
      ...source,
      signedScreenshotUrl,
      element_info,
    };
  });

  // 8. Build steps with source data
  const sourcesMap = new Map(sourcesWithSignedUrls.map(s => [s.id, s]));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const stepsWithSources: StepWithSignedUrl[] = (steps || []).map((step: any) => {
    const source = step.source_id ? sourcesMap.get(step.source_id) : null;

    // Parse annotations from JSON if present
    const annotations = step.annotations
      ? (step.annotations as unknown as Annotation[])
      : undefined;

    return {
      id: step.id,
      tutorial_id: step.tutorial_id,
      source_id: step.source_id,
      order_index: step.order_index,
      text_content: step.text_content,
      description: step.description ?? null,
      step_type: step.step_type || 'text',
      annotations,
      created_at: step.created_at,
      url: step.url || null,
      // From joined source
      signedScreenshotUrl: source?.signedScreenshotUrl || null,
      source: source || null,
      // Legacy fields for compatibility
      click_x: source?.click_x || null,
      click_y: source?.click_y || null,
      viewport_width: source?.viewport_width || null,
      viewport_height: source?.viewport_height || null,
      element_info: source?.element_info || null,
    };
  });

  return (
    <EditorClient
      initialTutorial={tutorial}
      initialSources={sourcesWithSignedUrls}
      initialSteps={stepsWithSources}
      audioUrl={audioSignedUrlResult.data?.signedUrl || null}
    />
  );
}
