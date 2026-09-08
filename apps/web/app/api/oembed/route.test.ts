import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { GET } from './route';

vi.mock('@/lib/queries/public-tutorials', () => ({
  getPublicTutorialByToken: vi.fn(),
  getPublicTutorialBySlug: vi.fn(),
}));

import {
  getPublicTutorialBySlug,
  getPublicTutorialByToken,
} from '@/lib/queries/public-tutorials';

const mockGetByToken = getPublicTutorialByToken as ReturnType<typeof vi.fn>;
const mockGetBySlug = getPublicTutorialBySlug as ReturnType<typeof vi.fn>;

function requestFor(url: string) {
  return new NextRequest(`http://localhost/api/oembed?url=${encodeURIComponent(url)}`);
}

const publicTutorialData = {
  tutorial: {
    id: 'tut-1',
    title: 'Publish a guide',
    description: 'A clean tutorial',
    slug: 'publish-guide',
    publicToken: 'token-123',
    status: 'ready',
    visibility: 'public',
    publishedAt: '2026-05-01',
    createdAt: '2026-05-01',
    updatedAt: '2026-05-01',
  },
  steps: [{ id: 'step-1' }],
  previewImageUrl: 'https://cdn.example.com/preview.png',
};

describe('GET /api/oembed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = 'https://captuto.example';
  });

  it('returns oEmbed data for token URLs with a thumbnail', async () => {
    mockGetByToken.mockResolvedValue(publicTutorialData);

    const response = await GET(requestFor('https://captuto.example/t/token-123'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.title).toBe('Publish a guide');
    expect(body.thumbnail_url).toBe('https://cdn.example.com/preview.png');
    expect(body.html).toContain('/t/token-123/embed');
  });

  it('returns oEmbed data for public slug URLs', async () => {
    mockGetBySlug.mockResolvedValue(publicTutorialData);

    const response = await GET(requestFor('https://captuto.example/tutorial/publish-guide'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.provider_url).toBe('https://captuto.example');
  });
});
