import { resolveRequestUser } from '@/lib/auth/request';
import { AgentError, TutorialService } from '@/lib/agent/service';

export const runtime = 'nodejs';
export const maxDuration = 60;
export async function POST(request: Request, {params}:{params:{id:string}}) {
  try {
    const auth = await resolveRequestUser(request);
    if (!auth) return Response.json({error:'Unauthorized'},{status:401});
    await new TutorialService(auth).owned(params.id);
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || !['audio/mp4','audio/x-m4a','audio/webm','audio/mpeg','audio/wav'].includes(file.type)) {
      return Response.json({error:'Provide an audio file in multipart field file'},{status:400});
    }
    if (!file.size || file.size > 50 * 1024 * 1024) return Response.json({error:'Audio must be between 1 byte and 50 MB'},{status:413});
    // Retain the established storage key; MIME type identifies native M4A correctly.
    const {error} = await auth.supabase.storage.from('recordings').upload(`${auth.userId}/${params.id}.webm`,await file.arrayBuffer(),{contentType:file.type,upsert:true});
    if (error) throw new AgentError('Could not upload audio',500);
    const {error:cacheError} = await auth.supabase.storage.from('recordings').remove([`${auth.userId}/${params.id}.transcript.json`]);
    if (cacheError) throw new AgentError('Audio uploaded but transcript cache could not be invalidated. Retry upload.',500);
    return Response.json({success:true,transcriptionStatus:'pending'});
  } catch(error) {
    return Response.json({error:error instanceof AgentError ? error.message : 'Audio upload failed'},{status:error instanceof AgentError ? error.status : 500});
  }
}
