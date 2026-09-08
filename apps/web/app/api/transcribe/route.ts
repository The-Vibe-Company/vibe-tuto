import { resolveRequestUser } from '@/lib/auth/request';
import { transcribeTutorial } from '@/lib/agent/transcription';
import { AgentError } from '@/lib/agent/service';
import { z } from 'zod';
export const maxDuration = 120;
export async function POST(request:Request) {
  try {
    const auth=await resolveRequestUser(request);
    if(!auth)return Response.json({error:'Unauthorized'},{status:401});
    const body=z.object({tutorialId:z.string().uuid()}).safeParse(await request.json());
    if(!body.success)return Response.json({error:'Valid tutorialId required'},{status:400});
    return Response.json(await transcribeTutorial(auth,body.data.tutorialId));
  }catch(e){return Response.json({error:e instanceof AgentError ? e.message : 'Transcription failed; audio is preserved. Retry later.'},{status:e instanceof AgentError ? e.status : e instanceof SyntaxError ? 400 : 500});}
}
