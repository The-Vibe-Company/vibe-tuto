import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Fetch tutorial
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('*')
      .eq('id', id)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    // 3. Check ownership
    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Fetch steps
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('*')
      .eq('tutorial_id', id)
      .order('order_index', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps:', stepsError);
      return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
    }

    // 5. Generate signed URLs for screenshots
    const stepsWithSignedUrls = await Promise.all(
      (steps || []).map(async (step) => {
        let signedScreenshotUrl: string | null = null;

        if (step.screenshot_url) {
          const { data: signedUrl } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(step.screenshot_url, 3600); // 1 hour

          signedScreenshotUrl = signedUrl?.signedUrl || null;
        }

        return {
          ...step,
          signedScreenshotUrl,
        };
      })
    );

    return NextResponse.json({
      tutorial,
      steps: stepsWithSignedUrls,
    });
  } catch (error) {
    console.error('Error fetching tutorial:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
