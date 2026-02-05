import { createClient } from '@/lib/supabase/server';
import type { StepWithSignedUrl, StepType } from '@/lib/types/editor';

export interface PublicTutorial {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PublicTutorialData {
  tutorial: PublicTutorial;
  steps: StepWithSignedUrl[];
}

async function processSteps(
  supabase: Awaited<ReturnType<typeof createClient>>,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  steps: any[]
): Promise<StepWithSignedUrl[]> {
  return Promise.all(
    steps.map(async (step) => {
      let signedScreenshotUrl: string | null = null;
      const source = step.sources;

      if (source?.screenshot_url) {
        const { data: signedUrl } = await supabase.storage
          .from('screenshots')
          .createSignedUrl(source.screenshot_url, 60 * 60 * 24 * 7); // 7 days

        signedScreenshotUrl = signedUrl?.signedUrl || null;
      }

      // Parse element_info if it's a string
      let elementInfo = source?.element_info;
      if (typeof elementInfo === 'string') {
        try {
          elementInfo = JSON.parse(elementInfo);
        } catch {
          elementInfo = null;
        }
      }

      // Parse annotations if it's a string
      let annotations = step.annotations;
      if (typeof annotations === 'string') {
        try {
          annotations = JSON.parse(annotations);
        } catch {
          annotations = null;
        }
      }

      return {
        id: step.id,
        tutorial_id: step.tutorial_id,
        source_id: step.source_id,
        order_index: step.order_index,
        text_content: step.text_content,
        description: step.description ?? null,
        step_type: step.step_type as StepType,
        annotations,
        created_at: step.created_at,
        signedScreenshotUrl,
        source: source ? {
          ...source,
          signedScreenshotUrl,
          element_info: elementInfo,
        } : null,
        click_x: source?.click_x ?? null,
        click_y: source?.click_y ?? null,
        viewport_width: source?.viewport_width ?? null,
        viewport_height: source?.viewport_height ?? null,
        element_info: elementInfo ?? null,
        url: step.url ?? source?.url ?? null,
      };
    })
  );
}

export async function getPublicTutorialByToken(
  token: string
): Promise<PublicTutorialData | null> {
  try {
    const supabase = await createClient();

    // Fetch tutorial by public token
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tutorial, error: tutorialError } = await (supabase as any)
      .from('tutorials')
      .select(
        'id, title, description, slug, status, visibility, public_token, published_at, created_at, updated_at'
      )
      .eq('public_token', token)
      .single();

    if (tutorialError || !tutorial) {
      return null;
    }

    // Check visibility (should already be enforced by RLS)
    if (tutorial.visibility === 'private') {
      return null;
    }

    // Fetch steps with joined source data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: steps, error: stepsError } = await (supabase as any)
      .from('steps')
      .select(
        `
        id,
        tutorial_id,
        source_id,
        order_index,
        text_content,
        description,
        step_type,
        annotations,
        created_at,
        url,
        sources (
          id,
          screenshot_url,
          click_x,
          click_y,
          viewport_width,
          viewport_height,
          click_type,
          url,
          element_info
        )
      `
      )
      .eq('tutorial_id', tutorial.id)
      .order('order_index', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps:', stepsError);
      return null;
    }

    const stepsWithUrls = await processSteps(supabase, steps || []);

    return {
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        slug: tutorial.slug,
        status: tutorial.status,
        visibility: tutorial.visibility,
        publishedAt: tutorial.published_at,
        createdAt: tutorial.created_at,
        updatedAt: tutorial.updated_at,
      },
      steps: stepsWithUrls,
    };
  } catch (error) {
    console.error('Error fetching public tutorial by token:', error);
    return null;
  }
}

export async function getPublicTutorialBySlug(
  slug: string
): Promise<PublicTutorialData | null> {
  try {
    const supabase = await createClient();

    // Fetch tutorial by slug (only public tutorials)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: tutorial, error: tutorialError } = await (supabase as any)
      .from('tutorials')
      .select(
        'id, title, description, slug, status, visibility, public_token, published_at, created_at, updated_at'
      )
      .eq('slug', slug)
      .eq('visibility', 'public')
      .single();

    if (tutorialError || !tutorial) {
      return null;
    }

    // Fetch steps with joined source data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: steps, error: stepsError } = await (supabase as any)
      .from('steps')
      .select(
        `
        id,
        tutorial_id,
        source_id,
        order_index,
        text_content,
        description,
        step_type,
        annotations,
        created_at,
        url,
        sources (
          id,
          screenshot_url,
          click_x,
          click_y,
          viewport_width,
          viewport_height,
          click_type,
          url,
          element_info
        )
      `
      )
      .eq('tutorial_id', tutorial.id)
      .order('order_index', { ascending: true });

    if (stepsError) {
      console.error('Failed to fetch steps:', stepsError);
      return null;
    }

    const stepsWithUrls = await processSteps(supabase, steps || []);

    return {
      tutorial: {
        id: tutorial.id,
        title: tutorial.title,
        description: tutorial.description,
        slug: tutorial.slug,
        status: tutorial.status,
        visibility: tutorial.visibility,
        publishedAt: tutorial.published_at,
        createdAt: tutorial.created_at,
        updatedAt: tutorial.updated_at,
      },
      steps: stepsWithUrls,
    };
  } catch (error) {
    console.error('Error fetching public tutorial by slug:', error);
    return null;
  }
}
