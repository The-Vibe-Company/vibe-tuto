import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

type DashboardRow = {
  id: string;
  title: string;
  slug: string | null;
  status: string;
  visibility: string | null;
  created_at: string;
  steps_count: number;
  thumbnail_path: string | null;
};

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  rows?: DashboardRow[] | null;
  rpcError?: object | null;
  signedUrlResults?: Array<{ signedUrl: string; path: string }>;
}) {
  const {
    user = null,
    authError = null,
    rows = null,
    rpcError = null,
    signedUrlResults = [],
  } = overrides;

  const rpc = vi.fn().mockResolvedValue({ data: rows, error: rpcError });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    rpc,
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
        rows: [],
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
        rows: [
          {
            id: 't1',
            title: 'Tutorial 1',
            slug: 'tutorial-1',
            status: 'ready',
            visibility: 'public',
            created_at: '2024-01-01',
            steps_count: 5,
            thumbnail_path: 'path/to/screenshot1.png',
          },
          {
            id: 't2',
            title: 'Tutorial 2',
            slug: 'tutorial-2',
            status: 'draft',
            visibility: 'private',
            created_at: '2024-01-02',
            steps_count: 0,
            thumbnail_path: null,
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
        rows: null,
        rpcError: { message: 'DB error' },
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch tutorials');
  });

  it('calls the dashboard RPC with pagination args', async () => {
    const mockSupabase = createMockSupabase({
      user: { id: 'user-123' },
      rows: [],
    });

    mockCreateClient.mockResolvedValue(mockSupabase as any);

    await GET();

    expect(mockSupabase.rpc).toHaveBeenCalledWith(
      'get_user_dashboard_tutorials',
      expect.objectContaining({ p_limit: expect.any(Number), p_offset: 0 })
    );
  });

  it('handles tutorials with null visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        rows: [
          {
            id: 't1',
            title: 'No visibility',
            slug: 'no-vis',
            status: 'draft',
            visibility: null,
            created_at: '2024-01-01',
            steps_count: 0,
            thumbnail_path: null,
          },
        ],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials[0].visibility).toBe('private');
  });

  it('returns null thumbnail when thumbnail_path is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        rows: [
          {
            id: 't1',
            title: 'No thumb',
            slug: 'no-thumb',
            status: 'draft',
            visibility: 'private',
            created_at: '2024-01-01',
            steps_count: 0,
            thumbnail_path: null,
          },
        ],
      }) as any
    );

    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorials[0].thumbnailUrl).toBeNull();
  });
});
