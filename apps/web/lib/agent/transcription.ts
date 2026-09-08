import type { RequestUser } from '@/lib/auth/request';
import { getDeepgramClient, TRANSCRIPTION_OPTIONS } from '@/lib/deepgram';
import { AgentError, TutorialService } from './service';

export async function transcribeTutorial(auth: RequestUser, tutorialId: string) {
  await new TutorialService(auth).owned(tutorialId);
  const path = `${auth.userId}/${tutorialId}`;
  const { data: cached } = await auth.supabase.storage.from('recordings').download(`${path}.transcript.json`);
  if (cached) { try { return JSON.parse(await cached.text()); } catch { /* Regenerate corrupt cache. */ } }
  let {data:audio} = await auth.supabase.storage.from('recordings').download(`${path}.webm`);
  if (!audio) ({data:audio} = await auth.supabase.storage.from('recordings').download(`${path}.m4a`));
  if (!audio) throw new AgentError('Audio has not been uploaded',404);
  if (audio.size > 50 * 1024 * 1024) throw new AgentError('Audio exceeds 50 MB',413);
  // Send bytes: an external speech provider cannot fetch a localhost storage URL.
  const {result,error} = await getDeepgramClient().listen.prerecorded.transcribeFile(Buffer.from(await audio.arrayBuffer()),TRANSCRIPTION_OPTIONS);
  if (error || !result) throw new AgentError('Transcription unavailable; audio is preserved, retry later',502);
  const transcript = {
    segments:(result.results?.utterances ?? []).map(u => ({start:u.start,end:u.end,transcript:u.transcript})),
    metadata:{duration:result.metadata?.duration ?? 0,language:result.results?.channels?.[0]?.detected_language || 'fr'},
  };
  const {error:storeError} = await auth.supabase.storage.from('recordings').upload(`${path}.transcript.json`,JSON.stringify(transcript),{contentType:'application/json',upsert:true});
  if (storeError) throw new AgentError('Transcribed but could not persist transcript; retry later',500);
  return transcript;
}
