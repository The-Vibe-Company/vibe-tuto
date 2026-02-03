import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PATCH } from './route';

// Mock the entire supabase server module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

function createRequest(body: object) {
  return new Request('http://localhost/api/steps/step-123', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('PATCH /api/steps/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    });

    const request = createRequest({ text_content: 'New text' });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'step-123' }) });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when step is not found', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Not found' },
            }),
          }),
        }),
      }),
    });

    const request = createRequest({ text_content: 'New text' });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'step-123' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Step not found');
  });

  it('returns 403 when user is not the owner', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'step-123',
                tutorials: { user_id: 'other-user' },
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = createRequest({ text_content: 'New text' });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'step-123' }) });
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });

  it('returns 400 when text_content is invalid', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: 'step-123',
                tutorials: { user_id: 'user-123' },
              },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = createRequest({ text_content: 123 }); // Invalid type
    const response = await PATCH(request, { params: Promise.resolve({ id: 'step-123' }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('Invalid text_content');
  });

  it('returns updated step on success', async () => {
    const updatedStep = {
      id: 'step-123',
      text_content: 'New text content',
    };

    let fromCallCount = 0;
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123' } },
          error: null,
        }),
      },
      from: vi.fn().mockImplementation(() => {
        fromCallCount++;
        if (fromCallCount === 1) {
          // First call - get step with tutorial
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'step-123',
                    tutorials: { user_id: 'user-123' },
                  },
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Second call - update step
          return {
            update: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: updatedStep,
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
      }),
    });

    const request = createRequest({ text_content: 'New text content' });
    const response = await PATCH(request, { params: Promise.resolve({ id: 'step-123' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.step).toEqual(updatedStep);
  });
});
