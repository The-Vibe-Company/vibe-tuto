import { resolveRequestUser } from '@/lib/auth/request';
import { AgentError, TutorialService } from '@/lib/agent/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(request:Request,{params}:{params:{id:string;stepId:string}}) {
  try {
    const auth = await resolveRequestUser(request);
    if (!auth) return Response.json({error:'Unauthorized'},{status:401});
    const image = await new TutorialService(auth).preview(params.id,params.stepId);
    return new Response(new Uint8Array(image),{headers:{'Content-Type':'image/png','Cache-Control':'private, no-store'}});
  } catch(e) { return Response.json({error:e instanceof AgentError ? e.message : 'Preview failed'},{status:e instanceof AgentError ? e.status : 500}); }
}
