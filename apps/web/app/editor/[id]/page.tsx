import { redirect, notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { EditorClient } from '@/components/editor/EditorClient';
import type { StepWithSignedUrl } from '@/lib/types/editor';

interface EditorPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/login');
  }

  // 2. Fetch tutorial
  const { data: tutorial, error: tutorialError } = await supabase
    .from('tutorials')
    .select('*')
    .eq('id', id)
    .single();

  if (tutorialError || !tutorial) {
    notFound();
  }

  // 3. Check ownership
  if (tutorial.user_id !== user.id) {
    redirect('/dashboard?error=access_denied');
  }

  // 4. Fetch steps
  const { data: steps, error: stepsError } = await supabase
    .from('steps')
    .select('*')
    .eq('tutorial_id', id)
    .order('order_index', { ascending: true });

  if (stepsError) {
    console.error('Failed to fetch steps:', stepsError);
    throw new Error('Failed to fetch steps');
  }

  // 5. Generate signed URLs for screenshots
  const stepsWithSignedUrls: StepWithSignedUrl[] = await Promise.all(
    (steps || []).map(async (step) => {
      let signedScreenshotUrl: string | null = null;

      if (step.screenshot_url) {
        const { data: signedUrl } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(step.screenshot_url, 3600); // 1 hour

        signedScreenshotUrl = signedUrl?.signedUrl || null;
      }

      return {
        ...step,
        signedScreenshotUrl,
      };
    })
  );

  // 6. Generate signed URL for audio
  const audioPath = `${tutorial.user_id}/${tutorial.id}.webm`;
  const { data: audioSignedUrl } = await supabase.storage
    .from('recordings')
    .createSignedUrl(audioPath, 3600); // 1 hour

  return (
    <EditorClient
      initialTutorial={tutorial}
      initialSteps={stepsWithSignedUrls}
      audioUrl={audioSignedUrl?.signedUrl || null}
    />
  );
}
