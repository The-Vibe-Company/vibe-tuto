import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function wrapParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) } as any;
}

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorial?: Record<string, unknown> | null;
  tutorialError?: object | null;
  sources?: unknown[] | null;
  sourcesError?: object | null;
  signedUrlData?: { signedUrl: string } | null;
}) {
  const {
    user = null,
    authError = null,
    tutorial = null,
    tutorialError = null,
    sources = null,
    sourcesError = null,
    signedUrlData = null,
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
    if (table === 'sources') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: sources,
              error: sourcesError,
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
        createSignedUrl: vi.fn().mockResolvedValue({
          data: signedUrlData,
          error: null,
        }),
      }),
    },
  };
}

describe('GET /api/sources/[tutorialId]', () => {
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

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
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

    const request = new Request('http://localhost:3678/api/sources/nonexistent');
    const response = await GET(request, wrapParams({ tutorialId: 'nonexistent' }));
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

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns sources with signed URLs', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [
          {
            id: 's1',
            tutorial_id: 't1',
            screenshot_url: 'path/to/screenshot.png',
            element_info: null,
            order_index: 0,
          },
        ],
        signedUrlData: { signedUrl: 'https://signed-url.com/screenshot.png' },
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources).toHaveLength(1);
    expect(body.sources[0].signedScreenshotUrl).toBe('https://signed-url.com/screenshot.png');
  });

  it('parses element_info from JSON string', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [
          {
            id: 's1',
            tutorial_id: 't1',
            screenshot_url: null,
            element_info: '{"tag":"BUTTON","text":"Submit"}',
            order_index: 0,
          },
        ],
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources[0].element_info).toEqual({ tag: 'BUTTON', text: 'Submit' });
  });

  it('handles invalid JSON in element_info gracefully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [
          {
            id: 's1',
            tutorial_id: 't1',
            screenshot_url: null,
            element_info: 'invalid-json{',
            order_index: 0,
          },
        ],
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources[0].element_info).toBeNull();
  });

  it('returns empty sources array when no sources exist', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [],
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources).toEqual([]);
  });

  it('returns 500 when sources query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: null,
        sourcesError: { message: 'DB error' },
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch sources');
  });

  it('handles sources with element_info already as object', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [
          {
            id: 's1',
            tutorial_id: 't1',
            screenshot_url: null,
            element_info: { tag: 'A', text: 'Click me' },
            order_index: 0,
          },
        ],
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources[0].element_info).toEqual({ tag: 'A', text: 'Click me' });
  });

  it('returns null signedScreenshotUrl when source has no screenshot_url', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        sources: [
          {
            id: 's1',
            tutorial_id: 't1',
            screenshot_url: null,
            element_info: null,
            order_index: 0,
          },
        ],
      }) as any
    );

    const request = new Request('http://localhost:3678/api/sources/t1');
    const response = await GET(request, wrapParams({ tutorialId: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.sources[0].signedScreenshotUrl).toBeNull();
  });
});
