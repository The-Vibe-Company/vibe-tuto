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
  const { data: tutorials, error: tutorialsError } = await supabase
    .from('tutorials')
    .select(
      `
      id,
      title,
      status,
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

  // Generate signed URLs for thumbnails (first source's screenshot)
  const tutorialsWithThumbnails = await Promise.all(
    (tutorials || []).map(async (tutorial) => {
      // Get the first source's screenshot (sources = raw captured data)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: firstSource } = await (supabase as any)
        .from('sources')
        .select('screenshot_url')
        .eq('tutorial_id', tutorial.id)
        .order('order_index', { ascending: true })
        .limit(1)
        .single();

      let thumbnailUrl: string | null = null;

      if (firstSource?.screenshot_url) {
        const { data: signedUrlData } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(firstSource.screenshot_url, 3600); // 1 hour

        thumbnailUrl = signedUrlData?.signedUrl || null;
      }

      // Extract step count from the aggregation
      const stepsCount = Array.isArray(tutorial.steps)
        ? tutorial.steps[0]?.count || 0
        : 0;

      return {
        id: tutorial.id,
        title: tutorial.title,
        status: tutorial.status as 'draft' | 'processing' | 'ready' | 'error',
        stepsCount,
        thumbnailUrl,
        createdAt: tutorial.created_at,
      };
    })
  );

  return NextResponse.json({ tutorials: tutorialsWithThumbnails });
}
