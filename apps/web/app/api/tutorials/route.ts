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

  // Fetch tutorials with step count AND first source screenshot in a single query
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
      steps:steps(count),
      sources:sources(tutorial_id, screenshot_url, order_index)
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

  // Build thumbnail map from the joined sources data (pick first by order_index)
  const thumbnailMap = new Map<string, string>();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const tutorial of tutorials as any[]) {
    if (Array.isArray(tutorial.sources) && tutorial.sources.length > 0) {
      // Sort by order_index and pick the first one with a screenshot_url
      const sorted = [...tutorial.sources].sort(
        (a: { order_index: number }, b: { order_index: number }) => a.order_index - b.order_index
      );
      const first = sorted.find((s: { screenshot_url: string | null }) => s.screenshot_url);
      if (first?.screenshot_url) {
        thumbnailMap.set(tutorial.id, first.screenshot_url);
      }
    }
  }

  // Batch generate signed URLs in a single API call using createSignedUrls (plural)
  const screenshotPaths = Array.from(thumbnailMap.values());
  const signedUrlMap = new Map<string, string>();

  if (screenshotPaths.length > 0) {
    const { data: signedUrlResults } = await supabase.storage
      .from('screenshots')
      .createSignedUrls(screenshotPaths, 3600);

    if (signedUrlResults) {
      for (const result of signedUrlResults) {
        if (result.signedUrl && result.path) {
          signedUrlMap.set(result.path, result.signedUrl);
        }
      }
    }
  }

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
