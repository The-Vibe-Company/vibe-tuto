import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Upper bound on tutorials returned in one response. Set high enough that real
// users aren't silently truncated; the underlying RPC is O(1) per tutorial.
const DASHBOARD_MAX_TUTORIALS = 1000;
const SIGNED_URL_TTL_SECONDS = 3600;

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: rows, error: rpcError } = await supabase.rpc(
    'get_user_dashboard_tutorials',
    { p_limit: DASHBOARD_MAX_TUTORIALS, p_offset: 0 }
  );

  if (rpcError) {
    console.error('Error fetching tutorials:', rpcError);
    return NextResponse.json(
      { error: 'Failed to fetch tutorials' },
      { status: 500 }
    );
  }

  if (!rows || rows.length === 0) {
    return NextResponse.json({ tutorials: [] });
  }

  const screenshotPaths = rows
    .map((row) => row.thumbnail_path)
    .filter((path): path is string => !!path);

  const signedUrlMap = new Map<string, string>();
  if (screenshotPaths.length > 0) {
    const { data: signedUrlResults } = await supabase.storage
      .from('screenshots')
      .createSignedUrls(screenshotPaths, SIGNED_URL_TTL_SECONDS);

    if (signedUrlResults) {
      for (const result of signedUrlResults) {
        if (result.signedUrl && result.path) {
          signedUrlMap.set(result.path, result.signedUrl);
        }
      }
    }
  }

  const tutorials = rows.map((row) => ({
    id: row.id,
    title: row.title,
    slug: row.slug,
    status: row.status as 'draft' | 'processing' | 'ready' | 'error',
    visibility: row.visibility ?? 'private',
    stepsCount: Number(row.steps_count),
    thumbnailUrl: row.thumbnail_path
      ? signedUrlMap.get(row.thumbnail_path) ?? null
      : null,
    createdAt: row.created_at,
  }));

  return NextResponse.json({ tutorials });
}
