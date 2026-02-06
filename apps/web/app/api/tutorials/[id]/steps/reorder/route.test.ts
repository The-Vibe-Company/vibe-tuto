import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function wrapParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) } as any;
}

function createJsonRequest(url: string, body: object): Request {
  return new Request(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorial?: Record<string, unknown> | null;
  tutorialError?: object | null;
  steps?: Array<{ id: string }> | null;
  stepsError?: object | null;
  updateError?: object | null;
}) {
  const {
    user = null,
    authError = null,
    tutorial = null,
    tutorialError = null,
    steps = null,
    stepsError = null,
    updateError = null,
  } = overrides;

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'tutorials') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tutorial,
              error: tutorialError,
            }),
          }),
        }),
      };
    }
    if (table === 'steps') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: steps,
            error: stepsError,
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: null,
              error: updateError,
            }),
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: mockFrom,
  };
}

describe('PATCH /api/tutorials/[id]/steps/reorder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s1', 's2'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: null,
        tutorialError: { message: 'Not found' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/nonexistent/steps/reorder',
      { stepIds: ['s1'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 'nonexistent' }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Tutorial not found');
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'other-user' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s1'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns 400 when stepIds is not an array', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: 'not-an-array' }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('non-empty array');
  });

  it('returns 400 when stepIds is empty', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: [] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('non-empty array');
  });

  it('returns 400 when stepIds contain invalid IDs', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        steps: [{ id: 's1' }, { id: 's2' }],
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s1', 's2', 'invalid-id'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid step IDs');
    expect(body.invalidIds).toContain('invalid-id');
  });

  it('updates order_index for all steps successfully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        steps: [{ id: 's1' }, { id: 's2' }, { id: 's3' }],
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s3', 's1', 's2'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
  });

  it('returns 500 when fetching steps fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        steps: null,
        stepsError: { message: 'DB error' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s1'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to fetch steps');
  });

  it('returns 500 when update fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        steps: [{ id: 's1' }],
        updateError: { message: 'DB write error' },
      }) as any
    );

    const request = createJsonRequest(
      'http://localhost:3678/api/tutorials/t1/steps/reorder',
      { stepIds: ['s1'] }
    );
    const response = await PATCH(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to update step orders');
  });
});
