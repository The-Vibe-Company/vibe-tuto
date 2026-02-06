import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import type { Json } from '@/lib/supabase/types';
import type { DesktopActionType } from '@/lib/types/editor';
import { validateApiToken } from '@/lib/auth/api-token';

interface DesktopElementInfo {
  role?: string;
  title?: string;
  parent_chain?: string[];
}

interface DesktopStep {
  order_index: number;
  timestamp: number;
  action_type: DesktopActionType;
  screenshot_key: string;
  screenshot_data?: string | null; // base64-encoded JPEG from desktop app
  click_x?: number | null;
  click_y?: number | null;
  viewport_width?: number | null;
  viewport_height?: number | null;
  app_bundle_id?: string | null;
  app_name?: string | null;
  window_title?: string | null;
  url?: string | null;
  element_info?: DesktopElementInfo | null;
  auto_caption?: string | null;
}

interface DesktopRecordingPayload {
  recording: {
    title?: string;
    duration: number;
    started_at: string;
    macos_version?: string;
    screen_resolution?: string;
    apps_used?: string[];
  };
  steps: DesktopStep[];
  audio_key?: string | null;
}

export async function POST(request: Request) {
  try {
    // 1. Verify authentication (Supabase session OR API token)
    let userId: string | null = null;
    let supabase = await createClient();

    // Try Supabase session auth first
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else {
      // Fall back to API token auth (desktop app)
      // Token validation uses RPC (no service role key needed)
      userId = await validateApiToken(request);

      // For data operations, we need a service role client since the
      // cookie-based client has no user session for desktop requests
      if (userId) {
        supabase = createServiceClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
        );
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse JSON body
    let body: DesktopRecordingPayload;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    // 3. Validate payload
    if (!body.recording) {
      return NextResponse.json({ error: 'Missing recording metadata' }, { status: 400 });
    }

    if (!body.steps || body.steps.length === 0) {
      return NextResponse.json({ error: 'No steps provided' }, { status: 400 });
    }

    if (typeof body.recording.duration !== 'number' || body.recording.duration < 0) {
      return NextResponse.json({ error: 'Invalid recording duration' }, { status: 400 });
    }

    // 4. Generate a recording_id to group all sources from this session
    const recordingId = crypto.randomUUID();

    // 5. Create tutorial in DB
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .insert({
        user_id: userId,
        title: body.recording.title || 'Desktop Recording',
        status: 'processing',
      })
      .select()
      .single();

    if (tutorialError || !tutorial) {
      console.error('Failed to create tutorial:', tutorialError);
      return NextResponse.json(
        {
          error: 'Failed to create tutorial',
          details: tutorialError?.message || 'Unknown error',
        },
        { status: 500 }
      );
    }

    // 6. Upload screenshots to Storage and create sources for each step
    const sourceInserts = [];
    for (let i = 0; i < body.steps.length; i++) {
      const step = body.steps[i];
      let screenshotPath: string | null = null;

      // Upload base64 screenshot to Supabase Storage if provided
      if (step.screenshot_data) {
        try {
          const buffer = Buffer.from(step.screenshot_data, 'base64');
          const path = `${userId}/${tutorial.id}/${i}.jpg`;

          const { error: screenshotError } = await supabase.storage
            .from('screenshots')
            .upload(path, buffer, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (screenshotError) {
            console.error(`Failed to upload screenshot ${i}:`, screenshotError);
          } else {
            screenshotPath = path;
          }
        } catch (e) {
          console.error(`Failed to process screenshot ${i}:`, e);
        }
      }

      // Desktop app sends normalized coordinates (0-1), DB expects pixel integers.
      // If viewport dimensions are missing/zero, coordinates are meaningless — store null.
      const vw = step.viewport_width ?? 0;
      const vh = step.viewport_height ?? 0;
      const clickX = step.click_x != null && vw > 0
        ? Math.round(step.click_x * vw)
        : null;
      const clickY = step.click_y != null && vh > 0
        ? Math.round(step.click_y * vh)
        : null;

      sourceInserts.push({
        tutorial_id: tutorial.id,
        order_index: step.order_index ?? i,
        screenshot_url: screenshotPath || step.screenshot_key || null,
        click_x: clickX,
        click_y: clickY,
        viewport_width: step.viewport_width ?? null,
        viewport_height: step.viewport_height ?? null,
        click_type: step.action_type || 'click',
        url: step.url ?? null,
        timestamp_start: step.timestamp ?? null,
        element_info: (step.element_info as Json) ?? null,
        app_bundle_id: step.app_bundle_id ?? null,
        app_name: step.app_name ?? null,
        window_title: step.window_title ?? null,
        action_type: step.action_type ?? null,
        auto_caption: step.auto_caption ?? null,
        recording_id: recordingId,
      });
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error: sourcesError } = await (supabase as any)
      .from('sources')
      .insert(sourceInserts);

    if (sourcesError) {
      console.error('Failed to create sources:', sourcesError);
      // Don't fail the whole request - tutorial is created
    }

    // 7. If audio was uploaded, trigger transcription
    if (body.audio_key) {
      try {
        const transcribeHeaders: Record<string, string> = {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        };
        const authHeader = request.headers.get('authorization');
        if (authHeader) {
          transcribeHeaders['Authorization'] = authHeader;
        }
        const transcribeResponse = await fetch(new URL('/api/transcribe', request.url), {
          method: 'POST',
          headers: transcribeHeaders,
          body: JSON.stringify({ tutorialId: tutorial.id }),
        });

        if (!transcribeResponse.ok) {
          console.error('Transcription trigger failed:', await transcribeResponse.text());
          // Don't fail - transcription is optional
        }
      } catch (err) {
        console.error('Failed to trigger transcription:', err);
        // Don't fail - transcription is optional
      }
    }

    // 8. Return response
    return NextResponse.json({
      tutorialId: tutorial.id,
      recordingId,
      status: 'processing',
      sourcesCreated: sourceInserts.length,
      editorUrl: `/editor/${tutorial.id}`,
    });
  } catch (error) {
    console.error('Recording upload error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
