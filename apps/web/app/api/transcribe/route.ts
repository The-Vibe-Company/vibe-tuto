import { createClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { getDeepgramClient, TRANSCRIPTION_OPTIONS } from '@/lib/deepgram';
import { NextResponse } from 'next/server';
import { validateApiToken } from '@/lib/auth/api-token';

interface TranscribeRequest {
  tutorialId: string;
}

interface TranscriptionSegment {
  start: number;
  end: number;
  transcript: string;
}

export async function POST(request: Request) {
  try {
    let supabase = await createClient();

    // 1. Verify authentication (Supabase session OR API token)
    let userId: string | null = null;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      userId = user.id;
    } else {
      // Fall back to API token auth (desktop app)
      userId = await validateApiToken(request);
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

    // 2. Parse request body
    let body: TranscribeRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    if (!body.tutorialId || typeof body.tutorialId !== 'string') {
      return NextResponse.json({ error: 'Missing tutorialId' }, { status: 400 });
    }

    // 3. Fetch tutorial to verify existence
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id')
      .eq('id', body.tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    // 4. Check ownership
    if (tutorial.user_id !== userId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 5. Generate signed URL for audio file
    const audioPath = `${userId}/${tutorial.id}.webm`;
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('recordings')
      .createSignedUrl(audioPath, 300); // 5 minutes validity

    if (signedUrlError || !signedUrlData?.signedUrl) {
      return NextResponse.json({ error: 'Audio file not found' }, { status: 404 });
    }

    // 6. Call Deepgram API
    const deepgram = getDeepgramClient();
    const { result, error: deepgramError } = await deepgram.listen.prerecorded.transcribeUrl(
      { url: signedUrlData.signedUrl },
      TRANSCRIPTION_OPTIONS
    );

    if (deepgramError) {
      console.error('Deepgram transcription error:', deepgramError);
      return NextResponse.json({ error: 'Transcription failed' }, { status: 500 });
    }

    // 7. Parse and format segments
    const utterances = result?.results?.utterances || [];
    const segments: TranscriptionSegment[] = utterances.map((utterance) => ({
      start: utterance.start,
      end: utterance.end,
      transcript: utterance.transcript,
    }));

    // 8. Return formatted response
    return NextResponse.json({
      segments,
      metadata: {
        duration: result?.metadata?.duration || 0,
        language: result?.results?.channels?.[0]?.detected_language || 'fr',
      },
    });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
