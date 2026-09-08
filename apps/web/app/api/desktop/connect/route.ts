import { createHmac } from 'node:crypto';
import { beginConnectionSchema, pairingJson } from '@/lib/desktop/connect';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';
export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > 2048) return pairingJson({ error: 'Connection request is too large.' }, 413);
    let input: unknown;
    try { input = JSON.parse(body); } catch { return pairingJson({ error: 'A SHA-256 code challenge is required.' }, 400); }
    const parsed = beginConnectionSchema.safeParse(input);
    if (!parsed.success) return pairingJson({ error: 'A SHA-256 code challenge is required.' }, 400);
    // Vercel supplies its own forwarding header. Other hosts must configure a
    // trusted reverse proxy; the global database cap also applies without IP trust.
    const address = request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-real-ip') || 'unidentified';
    const requester = createHmac('sha256', process.env.SUPABASE_SERVICE_ROLE_KEY || 'local-pairing').update(address.slice(0, 256)).digest('hex');
    const { data, error } = await createAdminClient().rpc('begin_desktop_connection', { code_challenge: parsed.data.codeChallenge, requester });
    if (error || !data || typeof data !== 'object' || Array.isArray(data)) return pairingJson({ error: 'Connection service unavailable.' }, 503);
    if (data.status === 'limited') {
      const response = pairingJson({ error: 'Too many connection requests. Wait a minute and try again.' }, 429);
      response.headers.set('Retry-After', '60');
      return response;
    }
    if (data.status !== 'created' || typeof data.id !== 'string') return pairingJson({ error: 'Could not start desktop connection.' }, 503);
    const connectUrl = new URL(`/connect/desktop?id=${data.id}`, request.url).toString();
    return pairingJson({ id: data.id, connectUrl, expiresIn: 300 });
  } catch { return pairingJson({ error: 'Connection service unavailable.' }, 503); }
}
