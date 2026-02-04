import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// GET /api/public/tutorials/token/[token] - Get public tutorial by token
// No authentication required - uses RLS policies for shared tutorials
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const supabase = await createClient();

    // Fetch tutorial by public token
    // RLS policy "Anyone can view shared tutorials" allows access to link_only and public tutorials
    // Note: Using type assertion as visibility/public_token columns are added by migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tutorial, error: tutorialError } = await (supabase as any)
      .from('tutorials')
      .select('id, title, description, slug, status, visibility, public_token, published_at, created_at, updated_at')
      .eq('public_token', token)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    // Double-check visibility (should already be enforced by RLS)
    if (tutorial.visibility === 'private') {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    // Fetch steps with joined source data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: steps, error: stepsError } = await (supabase as any)
      .from('steps')
      .select(`
        id,
        tutorial_id,
        source_id,
        order_index,
        text_content,
        step_type,
        annotations,
        created_at,
        sources (
          id,
          screenshot_url,
          click_x,
          click_y,
          viewport_width,
          viewport_height,
          click_type,
          url,
          element_info
        )
      `)
      .eq('tutorial_id', tutorial.id)
      .order('order_index', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps:', stepsError);
      return NextResponse.json(
        { error: 'Failed to fetch tutorial content' },
        { status: 500 }
      );
    }

    // Generate signed URLs for screenshots (7 days for public access)
    const stepsWithUrls = await Promise.all(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (steps || []).map(async (step: any) => {
        let signedScreenshotUrl: string | null = null;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const source = (step as any).sources;

        if (source?.screenshot_url) {
          const { data: signedUrl } = await supabase.storage
            .from('screenshots')
            .createSignedUrl(source.screenshot_url, 60 * 60 * 24 * 7); // 7 days

          signedScreenshotUrl = signedUrl?.signedUrl || null;
        }

        // Parse element_info if it's a string
        let elementInfo = source?.element_info;
        if (typeof elementInfo === 'string') {
          try {
            elementInfo = JSON.parse(elementInfo);
          } catch {
            elementInfo = null;
          }
        }

        // Parse annotations if it's a string
        let annotations = step.annotations;
        if (typeof annotations === 'string') {
          try {
            annotations = JSON.parse(annotations);
          } catch {
            annotations = null;
          }
        }

        return {
          id: step.id,
          tutorial_id: step.tutorial_id,
          source_id: step.source_id,
          order_index: step.order_index,
          text_content: step.text_content,
          step_type: step.step_type,
          annotations,
          created_at: step.created_at,
          signedScreenshotUrl,
          // Legacy fields for compatibility
          click_x: source?.click_x ?? null,
          click_y: source?.click_y ?? null,
          viewport_width: source?.viewport_width ?? null,
          viewport_height: source?.viewport_height ?? null,
          element_info: elementInfo ?? null,
          url: source?.url ?? null,
        };
      })
    );

    return NextResponse.json({
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        slug: tutorial.slug,
        status: tutorial.status,
        visibility: tutorial.visibility,
        publishedAt: tutorial.published_at,
        createdAt: tutorial.created_at,
        updatedAt: tutorial.updated_at,
      },
      steps: stepsWithUrls,
    });
  } catch (error) {
    console.error('Error fetching public tutorial:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
