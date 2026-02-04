import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch tutorials with step count
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tutorials, error: tutorialsError } = await (supabase as any)
    .from('tutorials')
    .select(
      `
      id,
      title,
      slug,
      status,
      visibility,
      created_at,
      steps:steps(count)
    `
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (tutorialsError) {
    console.error('Error fetching tutorials:', tutorialsError);
    return NextResponse.json(
      { error: 'Failed to fetch tutorials' },
      { status: 500 }
    );
  }

  if (!tutorials || tutorials.length === 0) {
    return NextResponse.json({ tutorials: [] });
  }

  // Get all tutorial IDs for batch query
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tutorialIds = tutorials.map((t: any) => t.id);

  // Batch fetch first sources for all tutorials in ONE query using distinct on tutorial_id
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: firstSources } = await (supabase as any)
    .from('sources')
    .select('tutorial_id, screenshot_url')
    .in('tutorial_id', tutorialIds)
    .order('tutorial_id')
    .order('order_index', { ascending: true });

  // Create a map of tutorial_id -> first screenshot_url
  const thumbnailMap = new Map<string, string>();
  if (firstSources) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const source of firstSources as any[]) {
      // Only keep the first source per tutorial (they're ordered by order_index)
      if (!thumbnailMap.has(source.tutorial_id) && source.screenshot_url) {
        thumbnailMap.set(source.tutorial_id, source.screenshot_url);
      }
    }
  }

  // Batch generate signed URLs for all thumbnails in parallel
  const screenshotPaths = Array.from(thumbnailMap.values());
  const signedUrlPromises = screenshotPaths.map(path =>
    supabase.storage.from('screenshots').createSignedUrl(path, 3600)
  );
  const signedUrlResults = await Promise.all(signedUrlPromises);

  // Create a map of path -> signed URL
  const signedUrlMap = new Map<string, string>();
  screenshotPaths.forEach((path, index) => {
    const result = signedUrlResults[index];
    if (result.data?.signedUrl) {
      signedUrlMap.set(path, result.data.signedUrl);
    }
  });

  // Build final response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const tutorialsWithThumbnails = tutorials.map((tutorial: any) => {
    const screenshotPath = thumbnailMap.get(tutorial.id);
    const thumbnailUrl = screenshotPath ? signedUrlMap.get(screenshotPath) || null : null;

    // Extract step count from the aggregation
    const stepsCount = Array.isArray(tutorial.steps)
      ? tutorial.steps[0]?.count || 0
      : 0;

    return {
      id: tutorial.id,
      title: tutorial.title,
      slug: tutorial.slug,
      status: tutorial.status as 'draft' | 'processing' | 'ready' | 'error',
      visibility: tutorial.visibility || 'private',
      stepsCount,
      thumbnailUrl,
      createdAt: tutorial.created_at,
    };
  });

  return NextResponse.json({ tutorials: tutorialsWithThumbnails });
}
