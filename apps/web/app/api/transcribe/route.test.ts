import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

// Mock the Deepgram client
vi.mock('@/lib/deepgram', () => ({
  getDeepgramClient: vi.fn(),
  TRANSCRIPTION_OPTIONS: {
    model: 'nova-2',
    language: 'fr',
    punctuate: true,
    utterances: true,
    smart_format: true,
  },
}));

import { createClient } from '@/lib/supabase/server';
import { getDeepgramClient } from '@/lib/deepgram';

const mockCreateClient = vi.mocked(createClient);
const mockGetDeepgramClient = vi.mocked(getDeepgramClient);

// Helper to create a mock Request with JSON body
function createMockRequest(body: object): Request {
  return new Request('http://localhost:3000/api/transcribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('POST /api/transcribe', () => {
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
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when body is not valid JSON', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = new Request('http://localhost:3000/api/transcribe', {
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
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const request = createMockRequest({});
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing tutorialId');
  });

  it('returns 404 when tutorial does not exist', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
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
    } as any);

    const request = createMockRequest({ tutorialId: 'non-existent' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Tutorial not found');
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'tutorial-123', user_id: 'other-user' },
              error: null,
            }),
          }),
        }),
      }),
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Access denied');
  });

  it('returns 404 when audio file does not exist', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'tutorial-123', user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'File not found' },
          }),
        }),
      },
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Audio file not found');
  });

  it('returns 500 when Deepgram transcription fails', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'tutorial-123', user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/audio.webm' },
            error: null,
          }),
        }),
      },
    } as any);

    mockGetDeepgramClient.mockReturnValue({
      listen: {
        prerecorded: {
          transcribeUrl: vi.fn().mockResolvedValue({
            result: null,
            error: { message: 'Deepgram error' },
          }),
        },
      },
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toBe('Transcription failed');
  });

  it('returns 200 with segments when transcription succeeds', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'tutorial-123', user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/audio.webm' },
            error: null,
          }),
        }),
      },
    } as any);

    mockGetDeepgramClient.mockReturnValue({
      listen: {
        prerecorded: {
          transcribeUrl: vi.fn().mockResolvedValue({
            result: {
              metadata: { duration: 45.5 },
              results: {
                channels: [{ detected_language: 'fr' }],
                utterances: [
                  { start: 0.0, end: 2.5, transcript: "D'abord on clique sur le bouton" },
                  { start: 2.5, end: 5.0, transcript: 'Ensuite on remplit le formulaire' },
                ],
              },
            },
            error: null,
          }),
        },
      },
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.segments).toHaveLength(2);
    expect(body.segments[0]).toEqual({
      start: 0.0,
      end: 2.5,
      transcript: "D'abord on clique sur le bouton",
    });
    expect(body.segments[1]).toEqual({
      start: 2.5,
      end: 5.0,
      transcript: 'Ensuite on remplit le formulaire',
    });
    expect(body.metadata.duration).toBe(45.5);
    expect(body.metadata.language).toBe('fr');
  });

  it('returns empty segments array when audio has no speech', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { id: 'tutorial-123', user_id: 'user-123' },
              error: null,
            }),
          }),
        }),
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          createSignedUrl: vi.fn().mockResolvedValue({
            data: { signedUrl: 'https://example.com/audio.webm' },
            error: null,
          }),
        }),
      },
    } as any);

    mockGetDeepgramClient.mockReturnValue({
      listen: {
        prerecorded: {
          transcribeUrl: vi.fn().mockResolvedValue({
            result: {
              metadata: { duration: 10.0 },
              results: {
                channels: [],
                utterances: [],
              },
            },
            error: null,
          }),
        },
      },
    } as any);

    const request = createMockRequest({ tutorialId: 'tutorial-123' });
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.segments).toEqual([]);
    expect(body.metadata.duration).toBe(10.0);
    expect(body.metadata.language).toBe('fr'); // Falls back to 'fr'
  });
});
