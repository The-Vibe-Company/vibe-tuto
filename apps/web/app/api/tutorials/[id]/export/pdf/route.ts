import { resolveRequestUser } from '@/lib/auth/request';
import { AgentError, TutorialService } from '@/lib/agent/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export async function GET(request:Request,{params}:{params:{id:string}}) {
  try {
    const auth = await resolveRequestUser(request);
    if (!auth) return Response.json({error:'Unauthorized'},{status:401});
    const pdf = await new TutorialService(auth).pdf(params.id);
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="captuto-guide.pdf"','Cache-Control':'private, no-store'}});
  } catch(e) { return Response.json({error:e instanceof AgentError ? e.message : 'PDF export failed'},{status:e instanceof AgentError ? e.status : 500}); }
}
