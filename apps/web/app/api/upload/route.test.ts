import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

// Mock the Supabase server client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

// Helper to create a mock Request with FormData
function createMockRequest(formData: FormData): Request {
  return new Request('http://localhost:3678/api/upload', {
    method: 'POST',
    body: formData,
  });
}

// Helper to create valid metadata
function createValidMetadata() {
  return {
    title: 'Test Tutorial',
    duration: 5000,
    startedAt: new Date().toISOString(),
    steps: [
      {
        timestamp: 0,
        type: 'click' as const,
        screenshot: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
        x: 100,
        y: 200,
        url: 'https://example.com',
      },
    ],
  };
}

describe('POST /api/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    // Mock unauthenticated user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: null },
          error: { message: 'Not authenticated' },
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(createValidMetadata()));

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when metadata is missing', async () => {
    // Mock authenticated user
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const formData = new FormData();
    // No metadata provided

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Missing metadata');
  });

  it('returns 400 when metadata is invalid JSON', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append('metadata', 'not valid json{');

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('Invalid metadata JSON');
  });

  it('returns 400 when steps array is empty', async () => {
    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
    } as any);

    const formData = new FormData();
    const metadata = createValidMetadata();
    metadata.steps = [];
    formData.append('metadata', JSON.stringify(metadata));

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe('No steps provided');
  });

  it('returns 200 and creates tutorial with valid data', async () => {
    const mockTutorial = {
      id: 'tutorial-123',
      user_id: 'user-123',
      title: 'Test Tutorial',
      status: 'processing',
    };

    const mockInsert = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: mockTutorial,
          error: null,
        }),
      }),
    });

    const mockSourcesInsert = vi.fn().mockResolvedValue({
      error: null,
    });

    const mockStorageUpload = vi.fn().mockResolvedValue({
      error: null,
    });

    mockCreateClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: 'user-123', email: 'test@example.com' } },
          error: null,
        }),
      },
      from: vi.fn((table: string) => {
        if (table === 'tutorials') {
          return { insert: mockInsert };
        }
        if (table === 'sources') {
          return { insert: mockSourcesInsert };
        }
        return {};
      }),
      storage: {
        from: vi.fn().mockReturnValue({
          upload: mockStorageUpload,
        }),
      },
    } as any);

    const formData = new FormData();
    formData.append('metadata', JSON.stringify(createValidMetadata()));

    const request = createMockRequest(formData);
    const response = await POST(request);

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.tutorialId).toBe('tutorial-123');
    expect(body.status).toBe('processing');
    expect(body.editorUrl).toBe('/editor/tutorial-123');

    // Verify tutorial was created
    expect(mockInsert).toHaveBeenCalledWith({
      user_id: 'user-123',
      title: 'Test Tutorial',
      status: 'processing',
    });

    // Verify sources were created
    expect(mockSourcesInsert).toHaveBeenCalled();

    // Verify screenshot was uploaded
    expect(mockStorageUpload).toHaveBeenCalled();
  });
});
