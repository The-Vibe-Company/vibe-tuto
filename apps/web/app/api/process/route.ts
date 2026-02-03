import { createClient } from '@/lib/supabase/server';
import { alignStepsWithTranscription, type TranscriptionSegment } from '@/lib/alignment';
import { NextResponse } from 'next/server';

interface ProcessRequest {
  tutorialId: string;
}

export async function POST(request: Request) {
  const supabase = await createClient();

  // Store tutorialId at function scope for error handling
  let tutorialIdForErrorHandling: string | undefined;

  try {
    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    let body: ProcessRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.tutorialId || typeof body.tutorialId !== 'string') {
      return NextResponse.json({ error: 'Missing tutorialId' }, { status: 400 });
    }

    // Store for error handling in catch block
    tutorialIdForErrorHandling = body.tutorialId;

    // 3. Fetch tutorial to verify existence and status
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id, status')
      .eq('id', body.tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    // 4. Check ownership
    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 5. Check status - only process draft or processing tutorials
    if (tutorial.status === 'ready') {
      return NextResponse.json(
        { error: 'Tutorial already processed', status: tutorial.status },
        { status: 400 }
      );
    }

    // 6. Set status to processing
    const { error: statusError } = await supabase
      .from('tutorials')
      .update({ status: 'processing' })
      .eq('id', tutorial.id);

    if (statusError) {
      console.error('Failed to update tutorial status:', statusError);
      return NextResponse.json({ error: 'Failed to start processing' }, { status: 500 });
    }

    // 7. Call /api/transcribe to get segments
    const transcribeResponse = await fetch(new URL('/api/transcribe', request.url), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Cookie: request.headers.get('cookie') || '',
      },
      body: JSON.stringify({ tutorialId: body.tutorialId }),
    });

    if (!transcribeResponse.ok) {
      const errorData = await transcribeResponse.json().catch(() => ({}));
      console.error('Transcription failed:', errorData);

      // Update status to error
      await supabase
        .from('tutorials')
        .update({ status: 'error' })
        .eq('id', tutorial.id);

      return NextResponse.json(
        { error: 'Transcription failed', details: errorData.error },
        { status: 500 }
      );
    }

    const transcribeData = await transcribeResponse.json();
    const segments: TranscriptionSegment[] = transcribeData.segments || [];

    // 8. Fetch steps for this tutorial
    const { data: steps, error: stepsError } = await supabase
      .from('steps')
      .select('id, timestamp_start')
      .eq('tutorial_id', tutorial.id)
      .order('order_index', { ascending: true });

    if (stepsError || !steps) {
      console.error('Failed to fetch steps:', stepsError);

      await supabase
        .from('tutorials')
        .update({ status: 'error' })
        .eq('id', tutorial.id);

      return NextResponse.json({ error: 'Failed to fetch steps' }, { status: 500 });
    }

    // 9. Align transcription with steps
    const alignedSteps = alignStepsWithTranscription(steps, segments);

    // 10. Batch update steps with aligned text
    const updatePromises = alignedSteps.map((aligned) =>
      supabase
        .from('steps')
        .update({
          text_content: aligned.textContent,
          timestamp_end: aligned.timestampEnd,
        })
        .eq('id', aligned.stepId)
    );

    const updateResults = await Promise.all(updatePromises);
    const updateErrors = updateResults.filter((r) => r.error);

    if (updateErrors.length > 0) {
      console.error('Some step updates failed:', updateErrors);
      // Continue anyway - partial success is better than total failure
    }

    // 11. Update tutorial status to ready
    const { error: finalStatusError } = await supabase
      .from('tutorials')
      .update({ status: 'ready' })
      .eq('id', tutorial.id);

    if (finalStatusError) {
      console.error('Failed to update final tutorial status:', finalStatusError);
      // Don't fail the request - the processing succeeded
    }

    // 12. Return success response
    return NextResponse.json({
      success: true,
      tutorialId: tutorial.id,
      status: 'ready',
      stepsUpdated: alignedSteps.length,
      segmentsFound: segments.length,
    });
  } catch (error) {
    console.error('Processing error:', error);

    // Try to set error status using stored tutorialId
    if (tutorialIdForErrorHandling) {
      try {
        await supabase
          .from('tutorials')
          .update({ status: 'error' })
          .eq('id', tutorialIdForErrorHandling);
      } catch {
        // Ignore cleanup errors
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
