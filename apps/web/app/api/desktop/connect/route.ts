import { beginConnectionSchema, pairingJson } from '@/lib/desktop/connect';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const parsed = beginConnectionSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return pairingJson({ error: 'A SHA-256 code challenge is required.' }, 400);
    const supabase = createAdminClient();
    const { error: cleanupError } = await supabase.from('desktop_connections').delete().lt('expires_at', new Date().toISOString());
    if (cleanupError) return pairingJson({ error: 'Connection service unavailable.' }, 503);
    const { data, error } = await supabase.from('desktop_connections').insert({ challenge: parsed.data.codeChallenge }).select('id').single();
    if (error || !data) return pairingJson({ error: 'Could not start desktop connection.' }, 503);
    const connectUrl = new URL(`/connect/desktop?id=${data.id}`, request.url).toString();
    return pairingJson({ id: data.id, connectUrl, expiresIn: 300 });
  } catch { return pairingJson({ error: 'Connection service unavailable.' }, 503); }
}
