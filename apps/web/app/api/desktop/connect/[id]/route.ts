import { connectionIdSchema, exchangeConnectionSchema, exchangeConnection, pairingJson } from '@/lib/desktop/connect';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const parsed = exchangeConnectionSchema.safeParse(await request.json().catch(() => null));
    if (!connectionIdSchema.safeParse(params.id).success || !parsed.success) return pairingJson({ error: 'Invalid connection proof.' }, 400);
    const result = await exchangeConnection(params.id, parsed.data.verifier);
    switch (result.status) {
      case 'connected': return pairingJson({ token: result.token });
      case 'pending': return pairingJson({ status: 'pending' }, 202);
      case 'invalid': return pairingJson({ error: 'Invalid connection proof.' }, 403);
      case 'expired':
      case 'revoked': return pairingJson({ error: 'Connection expired. Start again from Captuto for Mac.' }, 410);
    }
  } catch { return pairingJson({ error: 'Connection service unavailable.' }, 503); }
}
