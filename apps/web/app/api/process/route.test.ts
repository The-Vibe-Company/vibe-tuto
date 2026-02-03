import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock fetch for internal API calls
const mockFetch = vi.fn();
global.fetch = mockFetch;

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

// Helper to create a mock Request with JSON body
function createMockRequest(body: object): Request {
  return new Request('http://localhost:3000/api/process', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'session=test-cookie',
    },
    body: JSON.stringify(body),
  });
}

// Helper to create a mock supabase client with customizable behavior
function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorial?: { id: string; user_id: string; status: string } | null;
  tutorialError?: object | null;
  steps?: Array<{ id: string; timestamp_start: number }> | null;
  stepsError?: object | null;
  updateError?: object | null;
}) {
  const mockFrom = vi.fn();
  const mockSelect = vi.fn();
  const mockEq = vi.fn();
  const mockSingle = vi.fn();
  const mockUpdate = vi.fn();
  const mockOrder = vi.fn();

  // Chain for tutorial fetch
  mockFrom.mockImplementation((table: string) => {
    if (table === 'tutorials') {
      return {
        select: () => ({
          eq: () => ({
            single: () =>
              Promise.resolve({
                data: overrides.tutorial,
                error: overrides.tutorialError || null,
              }),
          }),
        }),
        update: () => ({
          eq: () =>
            Promise.resolve({
              data: null,
              error: overrides.updateError || null,
            }),
        }),
      };
    }
    if (table === 'steps') {
      return {
        select: () => ({
          eq: () => ({
            order: () =>
              Promise.resolve({
                data: overrides.steps,
                error: overrides.stepsError || null,
              }),
          }),
        }),
        update: () => ({
          eq: () =>
            Promise.resolve({
              data: null,
              error: overrides.updateError || null,
            }),
        }),
      };
    }
    return { select: mockSelect };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: overrides.user },
        error: overrides.authError || null,
      }),
    },
    from: mockFrom,
  };
}

describe('POST /api/process', () => {
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

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = new Request('http://localhost:3000/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: 'not valid json{',
    });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid JSON body');
  });

  it('returns 400 when tutorialId is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing tutorialId');
  });

  it('returns 404 when tutorial does not exist', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: null,
        tutorialError: { message: 'Not found' },
      }) as any
    );

    const request = createMockRequest({ tutorialId: 'non-existent' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Tutorial not found');
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'other-user', status: 'draft' },
      }) as any
    );

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns 400 when tutorial is already ready', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'ready' },
      }) as any
    );

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Tutorial already processed');
  });

  it('returns 500 when transcription fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'draft' },
      }) as any
    );

    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Transcription error' }),
    });

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Transcription failed');
  });

  it('returns 500 when fetching steps fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'draft' },
        steps: null,
        stepsError: { message: 'DB error' },
      }) as any
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          segments: [{ start: 0, end: 2, transcript: 'Hello' }],
        }),
    });

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Failed to fetch steps');
  });

  it('returns 200 and updates steps successfully', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'draft' },
        steps: [
          { id: 'step-1', timestamp_start: 0 },
          { id: 'step-2', timestamp_start: 2000 },
        ],
      }) as any
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          segments: [
            { start: 0, end: 1.5, transcript: 'First step' },
            { start: 2.5, end: 4, transcript: 'Second step' },
          ],
        }),
    });

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.tutorialId).toBe('tutorial-123');
    expect(body.status).toBe('ready');
    expect(body.stepsUpdated).toBe(2);
    expect(body.segmentsFound).toBe(2);
  });

  it('processes tutorial with no speech (empty segments)', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'processing' },
        steps: [{ id: 'step-1', timestamp_start: 0 }],
      }) as any
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ segments: [] }),
    });

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.success).toBe(true);
    expect(body.stepsUpdated).toBe(1);
    expect(body.segmentsFound).toBe(0);
  });

  it('calls /api/transcribe with correct parameters', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 'tutorial-123', user_id: 'user-123', status: 'draft' },
        steps: [],
      }) as any
    );

    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ segments: [] }),
    });

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    await POST(request);

    expect(mockFetch).toHaveBeenCalledWith(
      expect.any(URL),
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
        body: JSON.stringify({ tutorialId: 'tutorial-123' }),
      })
    );
  });
});
