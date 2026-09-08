import { createAdminClient } from '@/lib/supabase/admin';
import { AgentError, TutorialService } from '@/lib/agent/service';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;
export async function GET(_request:Request,{params}:{params:{token:string}}) {
  try {
    if (!/^[A-Za-z0-9_-]{12,64}$/.test(params.token)) return new Response('Not found',{status:404});
    const supabase = await createAdminClient();
    const {data} = await supabase.from('tutorials').select('id,user_id').eq('public_token',params.token).in('visibility',['link_only','public']).single();
    if (!data?.user_id) return new Response('Not found',{status:404});
    const pdf = await new TutorialService({supabase,userId:data.user_id}).pdf(data.id);
    return new Response(new Uint8Array(pdf),{headers:{'Content-Type':'application/pdf','Content-Disposition':'attachment; filename="captuto-guide.pdf"','Cache-Control':'private, no-store'}});
  } catch(e) { return Response.json({error:e instanceof AgentError ? e.message : 'PDF export failed'},{status:e instanceof AgentError ? e.status : 500}); }
}
