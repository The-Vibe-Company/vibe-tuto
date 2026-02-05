import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

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
  existingSteps?: Array<{ id: string }> | null;
  stepsError?: object | null;
  updateResult?: { data: unknown; error: unknown };
}) {
  const {
    user = null,
    authError = null,
    tutorial = null,
    tutorialError = null,
    existingSteps = null,
    stepsError = null,
    updateResult = { data: { id: 's1' }, error: null },
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
          eq: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({
              data: existingSteps,
              error: stepsError,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(updateResult),
              }),
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

describe('PATCH /api/steps/batch', () => {
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

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [{ id: 's1', text_content: 'Updated' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when tutorialId is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      updates: [{ id: 's1' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('tutorialId');
  });

  it('returns 400 when updates is not an array', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: 'not-an-array',
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('non-empty array');
  });

  it('returns 400 when updates is empty', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('non-empty array');
  });

  it('returns 400 when updates exceed 100 limit', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const updates = Array.from({ length: 101 }, (_, i) => ({
      id: `s${i}`,
      text_content: `Step ${i}`,
    }));

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates,
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Maximum 100');
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: null,
        tutorialError: { message: 'Not found' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 'nonexistent',
      updates: [{ id: 's1', text_content: 'Updated' }],
    });
    const response = await PATCH(request as any);
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

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [{ id: 's1', text_content: 'Updated' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns 400 when step IDs are invalid', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [{ id: 's1' }],
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [
        { id: 's1', text_content: 'Valid' },
        { id: 'invalid-id', text_content: 'Invalid' },
      ],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid step IDs');
    expect(body.invalidIds).toContain('invalid-id');
  });

  it('successfully updates steps and returns them', async () => {
    const updatedStep = {
      id: 's1',
      text_content: 'Updated content',
      tutorial_id: 't1',
    };

    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [{ id: 's1' }],
        updateResult: { data: updatedStep, error: null },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [{ id: 's1', text_content: 'Updated content' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.steps).toHaveLength(1);
    expect(body.steps[0]).toEqual(updatedStep);
  });

  it('returns 500 when verifying steps fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: null,
        stepsError: { message: 'DB error' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [{ id: 's1', text_content: 'Updated' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to verify steps');
  });

  it('handles partial update failures gracefully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [{ id: 's1' }],
        updateResult: { data: null, error: { message: 'Update failed' } },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps/batch', {
      tutorialId: 't1',
      updates: [{ id: 's1', text_content: 'Will fail' }],
    });
    const response = await PATCH(request as any);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.partial).toBe(true);
    expect(body.failed).toBeGreaterThan(0);
  });
});
