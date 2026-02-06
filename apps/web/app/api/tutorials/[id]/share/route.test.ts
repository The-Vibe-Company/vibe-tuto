import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn(() => 'mock-token-12'),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

const BASE_URL = 'http://localhost:3678';

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorial?: Record<string, unknown> | null;
  tutorialError?: object | null;
  updateError?: object | null;
}) {
  const {
    user = null,
    authError = null,
    tutorial = null,
    tutorialError = null,
    updateError = null,
  } = overrides;

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: vi.fn().mockImplementation(() => ({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: tutorial,
            error: tutorialError,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: updateError,
        }),
      }),
    })),
  };
}

function wrapParams(params: Record<string, string>) {
  return { params: Promise.resolve(params) } as any;
}

function createJsonRequest(url: string, body: object): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('GET /api/tutorials/[id]/share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`);
    const response = await GET(request as any, wrapParams({ id: 't1' }));
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

    const request = new Request(`${BASE_URL}/api/tutorials/nonexistent/share`);
    const response = await GET(request as any, wrapParams({ id: 'nonexistent' }));
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Tutorial not found');
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'other-user',
          slug: 'my-tutorial',
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`);
    const response = await GET(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns share info for private tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`);
    const response = await GET(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.visibility).toBe('private');
    expect(body.publicToken).toBeNull();
    expect(body.tokenUrl).toBeNull();
    expect(body.slugUrl).toBeNull();
    expect(body.embedUrl).toBeNull();
  });

  it('returns share info for link_only tutorial with token URLs', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'link_only',
          public_token: 'abc123token',
          published_at: '2024-01-01',
        },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`);
    const response = await GET(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.visibility).toBe('link_only');
    expect(body.publicToken).toBe('abc123token');
    expect(body.tokenUrl).toBe(`${BASE_URL}/t/abc123token`);
    expect(body.slugUrl).toBeNull(); // link_only doesn't get slugUrl
    expect(body.embedUrl).toBe(`${BASE_URL}/t/abc123token/embed`);
  });

  it('returns share info for public tutorial with all URLs', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'public',
          public_token: 'abc123token',
          published_at: '2024-01-01',
        },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`);
    const response = await GET(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.visibility).toBe('public');
    expect(body.tokenUrl).toBe(`${BASE_URL}/t/abc123token`);
    expect(body.slugUrl).toBe(`${BASE_URL}/tutorial/my-tutorial`);
    expect(body.embedUrl).toBe(`${BASE_URL}/t/abc123token/embed`);
  });
});

describe('POST /api/tutorials/[id]/share', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = BASE_URL;
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'public' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(401);
  });

  it('returns 400 for invalid JSON body', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = new Request(`${BASE_URL}/api/tutorials/t1/share`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not json{',
    });
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid request body');
  });

  it('returns 400 for invalid visibility value', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'invalid_value' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('Invalid visibility');
  });

  it('returns 400 when visibility is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      {}
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
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
      `${BASE_URL}/api/tutorials/nonexistent/share`,
      { visibility: 'public' }
    );
    const response = await POST(request as any, wrapParams({ id: 'nonexistent' }));
    expect(response.status).toBe(404);
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'other-user',
          slug: 'my-tutorial',
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'public' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(403);
  });

  it('returns 400 when setting public without a slug', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: null,
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'public' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('slug');
  });

  it('generates token when making link_only and no existing token', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'link_only' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.visibility).toBe('link_only');
    expect(body.publicToken).toBe('mock-token-12');
    expect(body.tokenUrl).toBe(`${BASE_URL}/t/mock-token-12`);
    expect(body.embedUrl).toBe(`${BASE_URL}/t/mock-token-12/embed`);
  });

  it('clears token when making private', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'link_only',
          public_token: 'existing-token',
          published_at: '2024-01-01',
        },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'private' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.visibility).toBe('private');
    expect(body.publicToken).toBeNull();
    expect(body.tokenUrl).toBeNull();
    expect(body.embedUrl).toBeNull();
  });

  it('returns 500 when update fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'private',
          public_token: null,
          published_at: null,
        },
        updateError: { message: 'DB error' },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'link_only' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to update');
  });

  it('preserves existing published_at when already set', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: {
          id: 't1',
          user_id: 'user-123',
          slug: 'my-tutorial',
          visibility: 'link_only',
          public_token: 'existing-token',
          published_at: '2024-01-01T00:00:00.000Z',
        },
      }) as any
    );

    const request = createJsonRequest(
      `${BASE_URL}/api/tutorials/t1/share`,
      { visibility: 'public' }
    );
    const response = await POST(request as any, wrapParams({ id: 't1' }));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    // Token should be preserved since it already exists
    expect(body.publicToken).toBe('existing-token');
  });
});
