import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/admin';

export const connectionIdSchema = z.string().uuid();
export const beginConnectionSchema = z.object({ codeChallenge: z.string().regex(/^[0-9a-f]{64}$/) }).strict();
export const exchangeConnectionSchema = z.object({ verifier: z.string().min(32).max(256).regex(/^[\x21-\x7e]+$/) }).strict();
const resultSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('connected'), token: z.string().regex(/^[0-9a-f]{64}$/) }),
  z.object({ status: z.enum(['pending', 'expired', 'invalid', 'revoked']) }),
]);

export function pairingJson(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { 'Cache-Control': 'no-store', 'Referrer-Policy': 'no-referrer' } });
}

export async function exchangeConnection(id: string, verifier: string) {
  const { data, error } = await createAdminClient().rpc('exchange_desktop_connection', { connection_id: id, verifier });
  if (error) throw new Error('Connection exchange failed');
  return resultSchema.parse(data);
}
