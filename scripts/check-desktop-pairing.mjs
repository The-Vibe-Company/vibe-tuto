// Real local-database check of pairing authorization, proof, concurrency and revocation.
// Start scripts/dev-backend.sh first. No cloud configuration is read.
import { readFile } from 'node:fs/promises';
import { createHash, randomBytes } from 'node:crypto';
import assert from 'node:assert/strict';
const config = JSON.parse(await readFile(new URL('../.env.supabase.status.json', import.meta.url), 'utf8'));
if (new URL(config.API_URL).hostname !== '127.0.0.1') throw new Error('This check only runs against local Supabase.');
const headers = { apikey: config.SERVICE_ROLE_KEY, Authorization: `Bearer ${config.SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' };
async function rest(route, method = 'GET', body, customHeaders = headers) {
  const response = await fetch(`${config.API_URL}${route}`, { method, headers: customHeaders, ...(body ? { body: JSON.stringify(body) } : {}) });
  if (!response.ok) throw new Error(`Local pairing check failed on ${method} ${route.split('?')[0]} (${response.status}).`);
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}
const users = await rest('/auth/v1/admin/users?page=1&per_page=1000');
const owner = users.users.find(user => user.email === 'admin@thevibecompany.co');
assert.ok(owner, 'Run dev-backend.sh to create the local account.');
const verifier = randomBytes(32).toString('hex');
const challenge = createHash('sha256').update(verifier).digest('hex');
const [connection] = await rest('/rest/v1/desktop_connections', 'POST', { challenge });
const exchange = proof => rest('/rest/v1/rpc/exchange_desktop_connection', 'POST', { connection_id: connection.id, verifier: proof });
let issuedId;
try {
  assert.equal((await exchange('x'.repeat(64))).status, 'invalid');
  assert.equal((await exchange(verifier)).status, 'pending');
  assert.equal(await rest('/rest/v1/rpc/approve_desktop_connection', 'POST', { connection_id: connection.id, approving_user_id: owner.id }), 'approved');
  // The second identity need not exist: the claimed guard must run before writing it.
  assert.equal(await rest('/rest/v1/rpc/approve_desktop_connection', 'POST', { connection_id: connection.id, approving_user_id: '11111111-1111-4111-8111-111111111111' }), 'claimed');
  const results = await Promise.all(Array.from({ length: 6 }, () => exchange(verifier)));
  assert.ok(results.every(result => result.status === 'connected'));
  assert.equal(new Set(results.map(result => result.token)).size, 1, 'Concurrent polls must return a single token.');
  const [issued] = await rest(`/rest/v1/desktop_connections?id=eq.${connection.id}&select=token_id`);
  issuedId = issued.token_id;
  assert.ok(issuedId);
  const anonymousResponse = await fetch(`${config.API_URL}/rest/v1/rpc/exchange_desktop_connection`, {
    method: 'POST', headers: { apikey: config.ANON_KEY, Authorization: `Bearer ${config.ANON_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ connection_id: connection.id, verifier }),
  });
  assert.ok([401, 403, 404].includes(anonymousResponse.status), 'Anonymous callers must not execute the privileged RPC.');
  await rest(`/rest/v1/api_tokens?id=eq.${issuedId}`, 'DELETE');
  assert.equal((await exchange(verifier)).status, 'revoked');
  await rest(`/rest/v1/desktop_connections?id=eq.${connection.id}`, 'PATCH', { expires_at: '2020-01-01T00:00:00Z' });
  assert.equal((await exchange(verifier)).status, 'expired');
  console.log('Desktop pairing SQL passed: proof, consent ownership, six concurrent retries, anonymous denial, revocation and expiry.');
} finally {
  if (issuedId) await rest(`/rest/v1/api_tokens?id=eq.${issuedId}`, 'DELETE');
  await rest(`/rest/v1/desktop_connections?id=eq.${connection.id}`, 'DELETE');
}
