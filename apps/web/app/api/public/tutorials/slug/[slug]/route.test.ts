import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { GET } from './route';

const mockCreateClient = createClient as ReturnType<typeof vi.fn>;

function createMockClient({
  tutorialResult = { data: null, error: null },
  stepsResult = { data: null, error: null },
  signedUrl = { data: { signedUrl: 'https://signed.url/img.png' }, error: null },
}: {
  tutorialResult?: { data: unknown; error: unknown };
  stepsResult?: { data: unknown; error: unknown };
  signedUrl?: { data: unknown; error: unknown };
} = {}) {
  let fromCallCount = 0;
  return {
    from: vi.fn().mockImplementation(() => {
      fromCallCount++;
      if (fromCallCount === 1) {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue(tutorialResult),
              }),
            }),
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue(stepsResult),
          }),
        }),
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: vi.fn().mockResolvedValue(signedUrl),
      }),
    },
  };
}

const mockTutorial = {
  id: 'tut-1',
  title: 'Test Tutorial',
  description: 'A test',
  slug: 'test-slug',
  status: 'published',
  visibility: 'public',
  public_token: 'token-abc',
  published_at: '2024-01-01',
  created_at: '2024-01-01',
  updated_at: '2024-01-01',
};

const mockStep = {
  id: 'step-1',
  tutorial_id: 'tut-1',
  source_id: 'src-1',
  order_index: 0,
  text_content: 'Click the button',
  step_type: 'click',
  annotations: null,
  created_at: '2024-01-01',
  sources: {
    id: 'src-1',
    screenshot_url: 'path/to/image.png',
    click_x: 100,
    click_y: 200,
    viewport_width: 1920,
    viewport_height: 1080,
    click_type: 'click',
    url: 'https://example.com',
    element_info: null,
  },
};

describe('GET /api/public/tutorials/slug/[slug]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: null, error: { message: 'Not found' } },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/nonexistent');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'nonexistent' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tutorial not found');
  });

  it('returns 404 when tutorial is not public (filtered by query)', async () => {
    // The route queries with .eq('visibility', 'public'), so non-public tutorials
    // return null from the query, resulting in 404
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: null, error: { message: 'Not found' } },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/private-tut');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'private-tut' }) });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('Tutorial not found');
  });

  it('returns tutorial data with steps', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.tutorial.id).toBe('tut-1');
    expect(data.tutorial.title).toBe('Test Tutorial');
    expect(data.steps).toHaveLength(1);
  });

  it('generates signed URLs for screenshots with 7-day expiry', async () => {
    const mockClient = createMockClient({
      tutorialResult: { data: mockTutorial, error: null },
      stepsResult: { data: [mockStep], error: null },
      signedUrl: { data: { signedUrl: 'https://signed.url/img.png' }, error: null },
    });
    mockCreateClient.mockResolvedValue(mockClient);

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(data.steps[0].signedScreenshotUrl).toBe('https://signed.url/img.png');
    // Verify createSignedUrl was called with 7 day seconds
    const storageMock = mockClient.storage.from('screenshots');
    expect(storageMock.createSignedUrl).toHaveBeenCalledWith(
      'path/to/image.png',
      60 * 60 * 24 * 7
    );
  });

  it('parses element_info when stored as string', async () => {
    const stepWithStringInfo = {
      ...mockStep,
      sources: {
        ...mockStep.sources,
        element_info: JSON.stringify({ tag: 'button', text: 'Submit' }),
      },
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStringInfo], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(data.steps[0].element_info).toEqual({ tag: 'button', text: 'Submit' });
  });

  it('parses annotations when stored as string', async () => {
    const stepWithStringAnnotations = {
      ...mockStep,
      annotations: JSON.stringify([{ type: 'highlight' }]),
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStringAnnotations], error: null },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(data.steps[0].annotations).toEqual([{ type: 'highlight' }]);
  });

  it('returns 500 when steps query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: null, error: { message: 'DB error' } },
      })
    );

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Failed to fetch tutorial content');
  });

  it('returns 500 on unexpected error', async () => {
    mockCreateClient.mockRejectedValue(new Error('Connection failed'));

    const request = new Request('http://localhost/api/public/tutorials/slug/test-slug');
    const response = await GET(request as any, { params: Promise.resolve({ slug: 'test-slug' }) });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe('Internal server error');
  });
});
