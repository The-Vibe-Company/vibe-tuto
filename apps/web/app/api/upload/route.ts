import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

interface UploadStep {
  timestamp: number;
  type: 'click' | 'navigation';
  screenshot: string;
  x?: number;
  y?: number;
  url: string;
}

interface UploadMetadata {
  title?: string;
  duration: number;
  startedAt: string;
  steps: UploadStep[];
}

function dataURLtoBuffer(dataURL: string): { buffer: Buffer; mimeType: string } {
  const matches = dataURL.match(/^data:([^;]+);base64,(.+)$/);
  if (!matches) {
    throw new Error('Invalid data URL format');
  }
  const mimeType = matches[1];
  const base64Data = matches[2];
  const buffer = Buffer.from(base64Data, 'base64');
  return { buffer, mimeType };
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // 2. Parse FormData
    const formData = await request.formData();
    const audio = formData.get('audio') as Blob | null;
    const metadataString = formData.get('metadata') as string | null;

    if (!metadataString) {
      return NextResponse.json(
        { error: 'Missing metadata' },
        { status: 400 }
      );
    }

    let metadata: UploadMetadata;
    try {
      metadata = JSON.parse(metadataString);
    } catch {
      return NextResponse.json(
        { error: 'Invalid metadata JSON' },
        { status: 400 }
      );
    }

    if (!metadata.steps || metadata.steps.length === 0) {
      return NextResponse.json(
        { error: 'No steps provided' },
        { status: 400 }
      );
    }

    // 3. Create tutorial in DB
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .insert({
        user_id: user.id,
        title: metadata.title || 'Sans titre',
        status: 'processing',
      })
      .select()
      .single();

    if (tutorialError || !tutorial) {
      console.error('Failed to create tutorial:', tutorialError);
      console.error('User ID used:', user.id);
      return NextResponse.json(
        {
          error: 'Failed to create tutorial',
          details: tutorialError?.message || 'Unknown error',
          code: tutorialError?.code,
        },
        { status: 500 }
      );
    }

    // 4. Upload audio to Storage (if provided)
    if (audio && audio.size > 0) {
      const audioBuffer = Buffer.from(await audio.arrayBuffer());
      const { error: audioUploadError } = await supabase.storage
        .from('recordings')
        .upload(`${user.id}/${tutorial.id}.webm`, audioBuffer, {
          contentType: 'audio/webm',
          upsert: false,
        });

      if (audioUploadError) {
        console.error('Failed to upload audio:', audioUploadError);
        // Continue anyway - audio is optional for now
      }
    }

    // 5. Upload screenshots and create steps
    const stepInserts = [];
    for (let i = 0; i < metadata.steps.length; i++) {
      const step = metadata.steps[i];
      let screenshotPath: string | null = null;

      // Upload screenshot if provided
      if (step.screenshot) {
        try {
          const { buffer, mimeType } = dataURLtoBuffer(step.screenshot);
          const extension = mimeType === 'image/png' ? 'png' : 'jpg';
          const path = `${user.id}/${tutorial.id}/${i}.${extension}`;

          const { error: screenshotError } = await supabase.storage
            .from('screenshots')
            .upload(path, buffer, {
              contentType: mimeType,
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

      stepInserts.push({
        tutorial_id: tutorial.id,
        order_index: i,
        screenshot_url: screenshotPath,
        click_x: step.x ?? null,
        click_y: step.y ?? null,
        click_type: step.type,
        url: step.url,
        timestamp_start: step.timestamp,
      });
    }

    // Batch insert all steps
    const { error: stepsError } = await supabase
      .from('steps')
      .insert(stepInserts);

    if (stepsError) {
      console.error('Failed to create steps:', stepsError);
      // Don't fail the whole request - tutorial is created
    }

    // 6. Return response
    return NextResponse.json({
      tutorialId: tutorial.id,
      status: 'processing',
      editorUrl: `/editor/${tutorial.id}`,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
