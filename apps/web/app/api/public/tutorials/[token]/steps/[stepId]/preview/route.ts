import { createAdminClient } from '@/lib/supabase/admin';
import { AgentError, TutorialService } from '@/lib/agent/service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export async function GET(_request: Request, { params }: { params: { token: string; stepId: string } }) {
  try {
    if (!/^[A-Za-z0-9_-]{12,64}$/.test(params.token)) return new Response('Not found', { status: 404 });
    const supabase = await createAdminClient();
    const { data } = await supabase.from('tutorials').select('id,user_id')
      .eq('public_token', params.token).in('visibility', ['link_only', 'public']).single();
    if (!data?.user_id) return new Response('Not found', { status: 404 });
    const image = await new TutorialService({ supabase, userId: data.user_id }).preview(data.id, params.stepId);
    return new Response(new Uint8Array(image), { headers: { 'Content-Type': 'image/png', 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (error) {
    return Response.json({ error: error instanceof AgentError ? error.message : 'Preview failed' }, { status: error instanceof AgentError ? error.status : 500 });
  }
}
