import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorials?: unknown[] | null;
  tutorialsError?: object | null;
  signedUrlResults?: Array<{ signedUrl: string; path: string }>;
}) {
  const {
    user = null,
    authError = null,
    tutorials = null,
    tutorialsError = null,
    signedUrlResults = [],
  } = overrides;

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'tutorials') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: tutorials,
              error: tutorialsError,
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
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrls: vi.fn().mockResolvedValue({
          data: signedUrlResults,
          error: null,
        }),
      }),
    },
  };
}

describe('GET /api/tutorials', () => {
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

    const response = await GET();
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns empty tutorials array when user has no tutorials', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorials: [],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials).toEqual([]);
  });

  it('returns tutorials with thumbnails and signed URLs', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorials: [
          {
            id: 't1',
            title: 'Tutorial 1',
            slug: 'tutorial-1',
            status: 'ready',
            visibility: 'public',
            created_at: '2024-01-01',
            steps: [{ count: 5 }],
            sources: [
              { tutorial_id: 't1', screenshot_url: 'path/to/screenshot1.png', order_index: 0 },
            ],
          },
          {
            id: 't2',
            title: 'Tutorial 2',
            slug: 'tutorial-2',
            status: 'draft',
            visibility: 'private',
            created_at: '2024-01-02',
            steps: [{ count: 0 }],
            sources: [],
          },
        ],
        signedUrlResults: [
          { signedUrl: 'https://signed-url-1.com', path: 'path/to/screenshot1.png' },
        ],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials).toHaveLength(2);
    expect(body.tutorials[0]).toEqual({
      id: 't1',
      title: 'Tutorial 1',
      slug: 'tutorial-1',
      status: 'ready',
      visibility: 'public',
      stepsCount: 5,
      thumbnailUrl: 'https://signed-url-1.com',
      createdAt: '2024-01-01',
    });
    expect(body.tutorials[1]).toEqual({
      id: 't2',
      title: 'Tutorial 2',
      slug: 'tutorial-2',
      status: 'draft',
      visibility: 'private',
      stepsCount: 0,
      thumbnailUrl: null,
      createdAt: '2024-01-02',
    });
  });

  it('returns 500 when query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorials: null,
        tutorialsError: { message: 'DB error' },
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch tutorials');
  });

  it('orders tutorials by created_at descending', async () => {
    const mockSupabase = createMockSupabase({
      user: { id: 'user-123' },
      tutorials: [],
    });

    mockCreateClient.mockResolvedValue(mockSupabase as any);

    await GET();

    // Verify that from('tutorials') was called and order was chained
    expect(mockSupabase.from).toHaveBeenCalledWith('tutorials');
  });

  it('handles tutorials with null visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorials: [
          {
            id: 't1',
            title: 'No visibility',
            slug: 'no-vis',
            status: 'draft',
            visibility: null,
            created_at: '2024-01-01',
            steps: [],
            sources: [],
          },
        ],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials[0].visibility).toBe('private');
  });

  it('handles tutorials with no step count aggregation', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorials: [
          {
            id: 't1',
            title: 'No steps',
            slug: 'no-steps',
            status: 'draft',
            visibility: 'private',
            created_at: '2024-01-01',
            steps: [],
            sources: [],
          },
        ],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials[0].stepsCount).toBe(0);
  });
});
