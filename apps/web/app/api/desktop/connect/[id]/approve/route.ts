import { connectionIdSchema, pairingJson } from '@/lib/desktop/connect';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function POST(request: Request, { params }: { params: { id: string } }) {
  if (request.headers.get('origin') !== new URL(request.url).origin) return pairingJson({ error: 'Untrusted request origin.' }, 403);
  if (!connectionIdSchema.safeParse(params.id).success) return pairingJson({ error: 'Invalid connection.' }, 400);
  try {
    // Consent must come from a signed-in browser, never another desktop API token.
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return pairingJson({ error: 'Sign in to connect Captuto for Mac.' }, 401);
    const { data, error } = await createAdminClient().rpc('approve_desktop_connection', { connection_id: params.id, approving_user_id: user.id });
    if (error) return pairingJson({ error: 'Could not approve connection.' }, 503);
    if (data === 'expired') return pairingJson({ error: 'This connection expired. Start again from Captuto for Mac.' }, 410);
    if (data === 'claimed') return pairingJson({ error: 'This connection has already been approved by another account.' }, 409);
    if (data !== 'approved') return pairingJson({ error: 'Could not approve connection.' }, 503);
    return pairingJson({ status: 'approved' });
  } catch { return pairingJson({ error: 'Connection service unavailable.' }, 503); }
}
