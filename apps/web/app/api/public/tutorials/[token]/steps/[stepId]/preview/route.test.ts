import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ single: vi.fn(), preview: vi.fn(), admin: vi.fn() }));
vi.mock('@/lib/supabase/admin', () => ({ createAdminClient: mocks.admin }));
vi.mock('@/lib/agent/service', () => ({
  AgentError: class extends Error { status = 404; },
  TutorialService: class { preview = mocks.preview; },
}));
import { GET } from './route';

beforeEach(() => {
  vi.clearAllMocks();
  const chain = { select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(), in: vi.fn().mockReturnThis(), single: mocks.single };
  mocks.admin.mockReturnValue({ from: () => chain });
});
const params = { token: 'valid-public-token', stepId: 'step-id' };
const request = new Request('http://localhost/preview');
describe('public flattened preview', () => {
  it('does not render private or missing tutorials', async () => {
    mocks.single.mockResolvedValue({ data: null });
    expect((await GET(request, { params })).status).toBe(404);
    expect(mocks.preview).not.toHaveBeenCalled();
  });
  it('rejects malformed tokens before accessing storage', async () => {
    expect((await GET(request, { params: { ...params, token: '../private' } })).status).toBe(404);
    expect(mocks.admin).not.toHaveBeenCalled();
  });
  it('uses the authorized tutorial and prevents public cache persistence', async () => {
    mocks.single.mockResolvedValue({ data: { id: 'tutorial-id', user_id: 'owner-id' } });
    mocks.preview.mockResolvedValue(Buffer.from('png'));
    const result = await GET(request, { params });
    expect(result.status).toBe(200);
    expect(mocks.preview).toHaveBeenCalledWith('tutorial-id', 'step-id');
    expect(result.headers.get('Content-Type')).toBe('image/png');
    expect(result.headers.get('Cache-Control')).toBe('private, no-store');
  });
});
