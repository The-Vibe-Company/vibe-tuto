import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@/lib/supabase/server';
import { getPublicTutorialByToken, getPublicTutorialBySlug } from './public-tutorials';

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
              single: vi.fn().mockResolvedValue(tutorialResult),
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
  description: 'A test description',
  slug: 'test-tutorial',
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
  description: null,
  step_type: 'click',
  annotations: null,
  created_at: '2024-01-01',
  url: null,
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

describe('getPublicTutorialByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: null, error: { message: 'Not found' } },
      })
    );

    const result = await getPublicTutorialByToken('nonexistent');
    expect(result).toBeNull();
  });

  it('returns null when tutorial is private', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: {
          data: { ...mockTutorial, visibility: 'private' },
          error: null,
        },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).toBeNull();
  });

  it('returns tutorial for link_only visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: {
          data: { ...mockTutorial, visibility: 'link_only' },
          error: null,
        },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).not.toBeNull();
    expect(result!.tutorial.visibility).toBe('link_only');
  });

  it('returns tutorial for public visibility', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).not.toBeNull();
    expect(result!.tutorial.id).toBe('tut-1');
    expect(result!.tutorial.title).toBe('Test Tutorial');
  });

  it('generates signed URLs for step screenshots', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
        signedUrl: { data: { signedUrl: 'https://signed.url/image.png' }, error: null },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).not.toBeNull();
    expect(result!.steps[0].signedScreenshotUrl).toBe('https://signed.url/image.png');
  });

  it('parses string element_info as JSON', async () => {
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

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).not.toBeNull();
    expect(result!.steps[0].element_info).toEqual({ tag: 'button', text: 'Submit' });
  });

  it('parses string annotations as JSON', async () => {
    const stepWithStringAnnotations = {
      ...mockStep,
      annotations: JSON.stringify([{ type: 'highlight', x: 10, y: 20 }]),
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStringAnnotations], error: null },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).not.toBeNull();
    expect(result!.steps[0].annotations).toEqual([{ type: 'highlight', x: 10, y: 20 }]);
  });

  it('returns null when steps query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: null, error: { message: 'DB error' } },
      })
    );

    const result = await getPublicTutorialByToken('token-abc');
    expect(result).toBeNull();
  });
});

describe('getPublicTutorialBySlug', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns null when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: null, error: { message: 'Not found' } },
      })
    );

    const result = await getPublicTutorialBySlug('nonexistent');
    expect(result).toBeNull();
  });

  it('returns public tutorial with steps', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [mockStep], error: null },
      })
    );

    const result = await getPublicTutorialBySlug('test-tutorial');
    expect(result).not.toBeNull();
    expect(result!.tutorial.slug).toBe('test-tutorial');
    expect(result!.steps).toHaveLength(1);
  });

  it('parses string element_info and annotations', async () => {
    const stepWithStrings = {
      ...mockStep,
      annotations: JSON.stringify([{ type: 'arrow' }]),
      sources: {
        ...mockStep.sources,
        element_info: JSON.stringify({ tag: 'a', text: 'Link' }),
      },
    };

    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: [stepWithStrings], error: null },
      })
    );

    const result = await getPublicTutorialBySlug('test-tutorial');
    expect(result).not.toBeNull();
    expect(result!.steps[0].element_info).toEqual({ tag: 'a', text: 'Link' });
    expect(result!.steps[0].annotations).toEqual([{ type: 'arrow' }]);
  });

  it('returns null when steps query fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockClient({
        tutorialResult: { data: mockTutorial, error: null },
        stepsResult: { data: null, error: { message: 'DB error' } },
      })
    );

    const result = await getPublicTutorialBySlug('test-tutorial');
    expect(result).toBeNull();
  });
});
