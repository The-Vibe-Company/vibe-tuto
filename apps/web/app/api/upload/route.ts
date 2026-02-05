import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import type { Json } from '@/lib/supabase/types';

interface ElementInfo {
  tag: string;
  text: string;
  id?: string;
  className?: string;
}

interface UploadSource {
  timestamp: number;
  type: 'click' | 'navigation' | 'tab_change';
  screenshot: string;
  x?: number;
  y?: number;
  viewportWidth?: number;
  viewportHeight?: number;
  url: string;
  elementInfo?: ElementInfo | null;
  tabTitle?: string | null;
}

interface UploadMetadata {
  title?: string;
  duration: number;
  startedAt: string;
  steps: UploadSource[]; // Called "steps" in extension for backwards compatibility
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

    // 5. Upload screenshots and create sources (raw captured data)
    const sourceInserts = [];
    for (let i = 0; i < metadata.steps.length; i++) {
      const source = metadata.steps[i];
      let screenshotPath: string | null = null;

      // Upload screenshot if provided
      if (source.screenshot) {
        try {
          const { buffer, mimeType } = dataURLtoBuffer(source.screenshot);
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

      // Sources contain raw captured data, no annotations or text_content
      // For tab_change events, store tabTitle in element_info
      const elementInfo = source.type === 'tab_change' && source.tabTitle
        ? { tabTitle: source.tabTitle }
        : source.elementInfo ?? null;

      sourceInserts.push({
        tutorial_id: tutorial.id,
        order_index: i,
        screenshot_url: screenshotPath,
        click_x: source.x ?? null,
        click_y: source.y ?? null,
        viewport_width: source.viewportWidth ?? null,
        viewport_height: source.viewportHeight ?? null,
        click_type: source.type,
        url: source.url,
        timestamp_start: source.timestamp,
        element_info: elementInfo as Json,
      });
    }

    // Batch insert all sources
    // Note: Using type assertion due to regenerated types not including all columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let { error: sourcesError } = await (supabase as any)
      .from('sources')
      .insert(sourceInserts);

    // If insert failed due to element_info column not existing, retry without it
    if (sourcesError && sourcesError.message?.includes('element_info')) {
      console.warn('element_info column not found, retrying without it');
      const sourceInsertsWithoutElementInfo = sourceInserts.map(({ element_info, ...rest }) => rest);
      const retryResult = await (supabase as any)
        .from('sources')
        .insert(sourceInsertsWithoutElementInfo);
      sourcesError = retryResult.error;
    }

    if (sourcesError) {
      console.error('Failed to create sources:', sourcesError);
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
