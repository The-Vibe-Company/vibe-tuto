import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

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
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .select('*')
    .eq('id', tutorialId)
    .single();

  if (tutorialError || !tutorial) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  // Verify ownership
  if (tutorial.user_id !== user.id) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  // Fetch steps
  const { data: steps, error: stepsError } = await supabase
    .from('steps')
    .select('*')
    .eq('tutorial_id', tutorialId)
    .order('order_index', { ascending: true });

  if (stepsError) {
    console.error('Error fetching steps:', stepsError);
    return NextResponse.json(
      { error: 'Failed to fetch steps' },
      { status: 500 }
    );
  }

  // Generate signed URLs for screenshots
  const stepsWithUrls = await Promise.all(
    (steps || []).map(async (step) => {
      if (!step.screenshot_url) {
        return step;
      }

      const { data: signedUrlData } = await supabase.storage
        .from('screenshots')
        .createSignedUrl(step.screenshot_url, 3600);

      return {
        ...step,
        screenshot_signed_url: signedUrlData?.signedUrl || null,
      };
    })
  );

  return NextResponse.json({ tutorial, steps: stepsWithUrls });
}

export async function DELETE(
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

  // Verify ownership
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .select('id, user_id')
    .eq('id', tutorialId)
    .single();

  if (tutorialError || !tutorial) {
    return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
  }

  if (tutorial.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Delete tutorial (cascade will handle steps)
  const { error: deleteError } = await supabase
    .from('tutorials')
    .delete()
    .eq('id', tutorialId);

  if (deleteError) {
    console.error('Error deleting tutorial:', deleteError);
    return NextResponse.json(
      { error: 'Failed to delete tutorial' },
      { status: 500 }
    );
  }

  // Also delete associated files from storage
  // Delete screenshots - list files first, then delete them
  const screenshotsFolder = `${user.id}/${tutorialId}`;
  const { data: screenshotFiles } = await supabase.storage
    .from('screenshots')
    .list(screenshotsFolder);
  if (screenshotFiles && screenshotFiles.length > 0) {
    const filePaths = screenshotFiles.map((f) => `${screenshotsFolder}/${f.name}`);
    await supabase.storage.from('screenshots').remove(filePaths);
  }

  // Delete audio recording
  const audioPath = `${user.id}/${tutorialId}.webm`;
  await supabase.storage.from('recordings').remove([audioPath]);

  return NextResponse.json({ success: true });
}
