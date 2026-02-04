import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { nanoid } from 'nanoid';

export type TutorialVisibility = 'private' | 'link_only' | 'public';

interface ShareRequestBody {
  visibility: TutorialVisibility;
}

interface ShareResponse {
  success: boolean;
  visibility: TutorialVisibility;
  publicToken: string | null;
  tokenUrl: string | null;
  slugUrl: string | null;
  embedUrl: string | null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch tutorial
  // Note: Using type assertion as visibility/public_token columns are added by migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tutorial, error: tutorialError } = await (supabase as any)
    .from('tutorials')
    .select('id, user_id, slug, visibility, public_token, published_at')
    .eq('id', tutorialId)
    .single();

  if (tutorialError || !tutorial) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  // Verify ownership
  if (tutorial.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const visibility = (tutorial.visibility || 'private') as TutorialVisibility;

  const response: ShareResponse = {
    success: true,
    visibility,
    publicToken: tutorial.public_token,
    tokenUrl: tutorial.public_token ? `${baseUrl}/t/${tutorial.public_token}` : null,
    slugUrl: visibility === 'public' && tutorial.slug ? `${baseUrl}/tutorial/${tutorial.slug}` : null,
    embedUrl: tutorial.public_token ? `${baseUrl}/t/${tutorial.public_token}/embed` : null,
  };

  return NextResponse.json(response);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tutorialId } = await params;

  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body: ShareRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { visibility } = body;

  // Validate visibility
  if (!visibility || !['private', 'link_only', 'public'].includes(visibility)) {
    return NextResponse.json(
      { error: 'Invalid visibility. Must be private, link_only, or public' },
      { status: 400 }
    );
  }

  // Fetch current tutorial
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: tutorial, error: tutorialError } = await (supabase as any)
    .from('tutorials')
    .select('id, user_id, slug, visibility, public_token, published_at')
    .eq('id', tutorialId)
    .single();

  if (tutorialError || !tutorial) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  // Verify ownership
  if (tutorial.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // For public visibility, check that slug exists
  if (visibility === 'public' && !tutorial.slug) {
    return NextResponse.json(
      { error: 'Tutorial must have a slug to be made fully public' },
      { status: 400 }
    );
  }

  // Prepare update data
  const isPublic = visibility !== 'private';
  let publicToken = tutorial.public_token;
  let publishedAt = tutorial.published_at;

  // Generate token if needed
  if (isPublic && !publicToken) {
    publicToken = nanoid(12);
  }

  // Clear token if making private
  if (!isPublic) {
    publicToken = null;
  }

  // Set published_at if first time publishing
  if (isPublic && !publishedAt) {
    publishedAt = new Date().toISOString();
  }

  // Update tutorial
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateError } = await (supabase as any)
    .from('tutorials')
    .update({
      visibility,
      is_public: isPublic,
      public_token: publicToken,
      published_at: publishedAt,
    })
    .eq('id', tutorialId);

  if (updateError) {
    console.error('Error updating tutorial visibility:', updateError);
    return NextResponse.json(
      { error: 'Failed to update sharing settings' },
      { status: 500 }
    );
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  const response: ShareResponse = {
    success: true,
    visibility,
    publicToken,
    tokenUrl: publicToken ? `${baseUrl}/t/${publicToken}` : null,
    slugUrl: visibility === 'public' && tutorial.slug ? `${baseUrl}/tutorial/${tutorial.slug}` : null,
    embedUrl: publicToken ? `${baseUrl}/t/${publicToken}/embed` : null,
  };

  return NextResponse.json(response);
}
