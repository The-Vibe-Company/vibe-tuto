import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), user: vi.fn(), insert: vi.fn(), single: vi.fn(), cleanup: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: () => ({
  rpc: mocks.rpc,
  from: () => ({ delete: () => ({ lt: mocks.cleanup }), insert: mocks.insert }),
}) }));
vi.mock('@/lib/supabase/server', () => ({ createClient: async () => ({ auth: { getUser: mocks.user } }) }));
import { POST as begin } from '@/app/api/desktop/connect/route';
import { POST as poll } from '@/app/api/desktop/connect/[id]/route';
import { POST as approve } from '@/app/api/desktop/connect/[id]/approve/route';
const id = '12345678-1234-4234-8234-123456789012';
const params = { id };
const verifier = 'a'.repeat(64);
const origin = 'http://localhost:3678';
const request = (body: unknown) => new Request(`${origin}/api/desktop/connect/${id}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
const approval = (requestOrigin = origin) => new Request(`${origin}/api/desktop/connect/${id}/approve`, { method: 'POST', headers: { origin: requestOrigin } });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.user.mockResolvedValue({ data: { user: { id: 'owner-id' } }, error: null });
  mocks.cleanup.mockResolvedValue({ error: null });
  mocks.insert.mockReturnValue({ select: () => ({ single: mocks.single }) });
  mocks.single.mockResolvedValue({ data: { id }, error: null });
  mocks.rpc.mockResolvedValue({data:{status:'created',id},error:null});
});

describe('desktop connection start', () => {
  it('returns a browser URL without a bearer token or verifier', async () => {
    const response = await begin(request({ codeChallenge: 'f'.repeat(64) }));
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ id, connectUrl: `${origin}/connect/desktop?id=${id}`, expiresIn: 300 });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('returns retryable429 when the shared admission quota is exhausted', async () => {
    mocks.rpc.mockResolvedValue({data:{status:'limited'},error:null});
    const response = await begin(request({codeChallenge:'f'.repeat(64)}));
    expect(response.status).toBe(429);
    expect(response.headers.get('retry-after')).toBe('60');
    expect(mocks.insert).not.toHaveBeenCalled();
    expect(mocks.cleanup).not.toHaveBeenCalled();
  });
  it('rejects missing or invalid challenges before writing' , async () => {
    expect((await begin(request({ codeChallenge: 'invalid' }))).status).toBe(400);
    expect(mocks.insert).not.toHaveBeenCalled();
  });
});

describe('desktop connection poll', () => {
  it.each([['pending', 202], ['expired', 410], ['invalid', 403], ['revoked', 410]])('maps %s to %s', async (status, code) => {
    mocks.rpc.mockResolvedValue({ data: { status }, error: null });
    expect((await poll(request({ verifier }), { params })).status).toBe(code);
    expect(mocks.rpc).toHaveBeenCalledWith('exchange_desktop_connection', { connection_id: id, verifier });
  });
  it('only releases the token when the proof exchange succeeds', async () => {
    mocks.rpc.mockResolvedValue({ data: { status: 'connected', token: 'b'.repeat(64) }, error: null });
    const response = await poll(request({ verifier }), { params });
    expect(await response.json()).toEqual({ token: 'b'.repeat(64) });
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects malformed verifier or connection ID before RPC', async () => {
    expect((await poll(request({ verifier: 'short' }), { params })).status).toBe(400);
    expect((await poll(request({ verifier }), { params: { id: 'invalid' } })).status).toBe(400);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});

describe('browser consent', () => {
  it('requires same-origin browser consent', async () => {
    expect((await approve(approval('https://evil.example'), { params })).status).toBe(403);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('requires cookie authentication, without accepting a supplied user ID', async () => {
    mocks.user.mockResolvedValue({ data: { user: null } });
    expect((await approve(approval(), { params })).status).toBe(401);
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('approves the authenticated account', async () => {
    mocks.rpc.mockResolvedValue({ data: 'approved', error: null });
    expect((await approve(approval(), { params })).status).toBe(200);
    expect(mocks.rpc).toHaveBeenCalledWith('approve_desktop_connection', { connection_id: id, approving_user_id: 'owner-id' });
  });
  it('does not let another account claim an approved connection', async () => {
    mocks.rpc.mockResolvedValue({ data: 'claimed', error: null });
    expect((await approve(approval(), { params })).status).toBe(409);
  });
});
