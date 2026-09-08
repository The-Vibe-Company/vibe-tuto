import { NextRequest, NextResponse } from 'next/server';
import { getPublicTutorialBySlug, getPublicTutorialByToken } from '@/lib/queries/public-tutorials';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const url = searchParams.get('url');
  const maxwidth = parseInt(searchParams.get('maxwidth') || '800', 10);
  const maxheight = parseInt(searchParams.get('maxheight') || '600', 10);

  if (!url) {
    return NextResponse.json(
      { error: 'Missing required parameter: url' },
      { status: 400 }
    );
  }

  // Parse the URL to extract token or slug
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }

  const tokenMatch = parsedUrl.pathname.match(/^\/t\/([^/]+)\/?$/);
  const slugMatch = parsedUrl.pathname.match(/^\/tutorial\/([^/]+)\/?$/);
  const embedTokenMatch = parsedUrl.pathname.match(/^\/t\/([^/]+)\/embed\/?$/);

  const token = tokenMatch?.[1] || embedTokenMatch?.[1];
  const slug = slugMatch?.[1];

  if (!token && !slug) {
    return NextResponse.json(
      { error: 'URL does not match a CapTuto tutorial' },
      { status: 404 }
    );
  }

  const data = token
    ? await getPublicTutorialByToken(token)
    : slug
      ? await getPublicTutorialBySlug(slug)
      : null;

  if (!data) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  const { tutorial, steps, previewImageUrl } = data;
  if (!tutorial.publicToken) {
    return NextResponse.json({ error: 'Tutorial is not embeddable' }, { status: 404 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const embedToken = tutorial.publicToken;
  const embedUrl = `${baseUrl}/t/${embedToken}/embed`;
  const thumbnailUrl =
    previewImageUrl ||
    `${baseUrl}/api/og/tutorial?title=${encodeURIComponent(tutorial.title)}&steps=${steps.length}`;

  const width = Math.min(maxwidth, 800);
  const height = Math.min(maxheight, 600);
  const description = tutorial.description || `Step-by-step tutorial: ${tutorial.title}`;

  const oembedResponse = {
    type: 'rich',
    version: '1.0',
    title: tutorial.title,
    description,
    provider_name: 'CapTuto',
    provider_url: baseUrl,
    html: `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="fullscreen" style="border:none;border-radius:8px;" title="${tutorial.title.replace(/"/g, '&quot;')}"></iframe>`,
    width,
    height,
    thumbnail_url: thumbnailUrl,
    thumbnail_width: 1200,
    thumbnail_height: 630,
  };

  return NextResponse.json(oembedResponse, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
