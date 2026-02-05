import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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

  // Fetch tutorial metadata (lightweight - no steps)
  const supabase = await createClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query = (supabase as any)
    .from('tutorials')
    .select('id, title, description, visibility, public_token, slug');

  if (token) {
    query = query.eq('public_token', token);
  } else if (slug) {
    query = query.eq('slug', slug).eq('visibility', 'public');
  }

  const { data: tutorial, error } = await query.single();

  if (error || !tutorial || tutorial.visibility === 'private') {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  // Build the embed URL using the token
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3678';
  const embedToken = tutorial.public_token;
  const embedUrl = `${baseUrl}/t/${embedToken}/embed`;

  const width = Math.min(maxwidth, 800);
  const height = Math.min(maxheight, 600);

  const oembedResponse = {
    type: 'rich',
    version: '1.0',
    title: tutorial.title,
    description: tutorial.description || undefined,
    provider_name: 'CapTuto',
    provider_url: 'https://captuto.com',
    html: `<iframe src="${embedUrl}" width="${width}" height="${height}" frameborder="0" allow="fullscreen" style="border:none;border-radius:8px;" title="${tutorial.title.replace(/"/g, '&quot;')}"></iframe>`,
    width,
    height,
    thumbnail_url: null,
  };

  return NextResponse.json(oembedResponse, {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
