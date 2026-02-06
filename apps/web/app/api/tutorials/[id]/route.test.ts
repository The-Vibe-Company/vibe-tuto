import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

// Mock the entire supabase server module
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

function wrapParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) } as any;
}

describe('GET /api/tutorials/[id]', () => {
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

    const request = new Request('http://localhost/api/tutorials/123');
    const response = await GET(request as any, wrapParams({ id: '123' }));
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('returns 404 when tutorial is not found', async () => {
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

    const request = new Request('http://localhost/api/tutorials/123');
    const response = await GET(request as any, wrapParams({ id: '123' }));
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tutorial not found');
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
              data: { id: 'tutorial-123', user_id: 'other-user', title: 'Test' },
              error: null,
            }),
          }),
        }),
      }),
    });

    const request = new Request('http://localhost/api/tutorials/123');
    const response = await GET(request as any, wrapParams({ id: '123' }));
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied');
  });

  it('returns tutorial with steps on success', async () => {
    const mockTutorial = {
      id: 'tutorial-123',
      user_id: 'user-123',
      title: 'Test Tutorial',
    };

    const mockSteps = [
      { id: 'step-1', order_index: 0, screenshot_url: null },
      { id: 'step-2', order_index: 1, screenshot_url: null },
    ];

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
          // First call - tutorials
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: mockTutorial,
                  error: null,
                }),
              }),
            }),
          };
        } else {
          // Second call - steps
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockSteps,
                  error: null,
                }),
              }),
            }),
          };
        }
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
          }),
        }),
      },
    });

    const request = new Request('http://localhost/api/tutorials/123');
    const response = await GET(request as any, wrapParams({ id: '123' }));
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tutorial).toEqual(mockTutorial);
    expect(data.steps).toHaveLength(2);
  });
});
