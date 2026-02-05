import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAnthropicClient, GENERATION_MODEL, GENERATION_CONFIG } from '@/lib/anthropic';
import {
  TUTORIAL_GENERATION_SCHEMA,
  getGenerationSystemPrompt,
  type GeneratedTutorialContent,
  type GenerateTutorialResponse,
  type GenerateTutorialErrorResponse,
  type GenerationOptions,
} from '@/lib/types/generation';
import type { ElementInfo } from '@/lib/types/editor';
import { alignStepsWithTranscription, type TranscriptionSegment } from '@/lib/alignment';

interface GenerateRequest {
  tutorialId: string;
  options?: GenerationOptions;
}

interface SourceData {
  id: string;
  screenshot_url: string | null;
  click_x: number | null;
  click_y: number | null;
  viewport_width: number | null;
  viewport_height: number | null;
  click_type: string | null;
  url: string | null;
  element_info: ElementInfo | null;
  order_index: number;
  timestamp_start: number | null;
}

interface StepData {
  id: string;
  source_id: string | null;
  text_content: string | null;
  order_index: number;
}

/**
 * Fetch an image from a signed URL and convert to base64.
 */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`Failed to fetch image: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return base64;
  } catch (error) {
    console.error('Error fetching image:', error);
    return null;
  }
}

export async function POST(request: Request) {
  const startTime = Date.now();
  const supabase = await createClient();

  try {
    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized', code: 'UNAUTHORIZED' } as GenerateTutorialErrorResponse,
        { status: 401 }
      );
    }

    // 2. Parse request body
    let body: GenerateRequest;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Invalid JSON body', code: 'INTERNAL_ERROR' } as GenerateTutorialErrorResponse,
        { status: 400 }
      );
    }

    if (!body.tutorialId || typeof body.tutorialId !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Missing tutorialId', code: 'INTERNAL_ERROR' } as GenerateTutorialErrorResponse,
        { status: 400 }
      );
    }

    // Extract generation options with defaults
    const options: GenerationOptions = {
      style: body.options?.style || 'normal',
      userGoal: body.options?.userGoal,
    };

    // 3. Fetch tutorial and verify ownership
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id, title, description')
      .eq('id', body.tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json(
        { success: false, error: 'Tutorial not found', code: 'NOT_FOUND' } as GenerateTutorialErrorResponse,
        { status: 404 }
      );
    }

    if (tutorial.user_id !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Access denied', code: 'UNAUTHORIZED' } as GenerateTutorialErrorResponse,
        { status: 403 }
      );
    }

    // 4. Fetch sources and steps in parallel
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const [sourcesResult, stepsResult] = await Promise.all([
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('sources')
        .select('id, screenshot_url, click_x, click_y, viewport_width, viewport_height, click_type, url, element_info, order_index, timestamp_start')
        .eq('tutorial_id', body.tutorialId)
        .order('order_index', { ascending: true }),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (supabase as any)
        .from('steps')
        .select('id, source_id, text_content, order_index')
        .eq('tutorial_id', body.tutorialId)
        .order('order_index', { ascending: true }),
    ]);

    if (sourcesResult.error) {
      console.error('Failed to fetch sources:', sourcesResult.error);
      return NextResponse.json(
        { success: false, error: 'Failed to fetch sources', code: 'INTERNAL_ERROR' } as GenerateTutorialErrorResponse,
        { status: 500 }
      );
    }

    const sources: SourceData[] = sourcesResult.data || [];
    const steps: StepData[] = stepsResult.data || [];

    // 5. Check if there are sources to generate from
    if (sources.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No sources found. Add screenshots to your tutorial first.', code: 'NO_SOURCES' } as GenerateTutorialErrorResponse,
        { status: 400 }
      );
    }

    // 6. Build a map of source_id -> step text_content (fallback for transcription)
    const stepTextBySourceId = new Map<string, string>();
    for (const step of steps) {
      if (step.source_id && step.text_content) {
        stepTextBySourceId.set(step.source_id, step.text_content);
      }
    }

    // 7. Get transcription from Deepgram (if audio exists)
    const transcriptionBySourceId = new Map<string, string>();

    try {
      const transcribeResponse = await fetch(new URL('/api/transcribe', request.url), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Cookie: request.headers.get('cookie') || '',
        },
        body: JSON.stringify({ tutorialId: body.tutorialId }),
      });

      if (transcribeResponse.ok) {
        const transcribeData = await transcribeResponse.json();
        const segments: TranscriptionSegment[] = transcribeData.segments || [];

        // Align transcription with sources based on timestamps
        const sourcesWithTimestamp = sources.filter(
          (s): s is SourceData & { timestamp_start: number } => s.timestamp_start !== null
        );

        if (sourcesWithTimestamp.length > 0 && segments.length > 0) {
          const aligned = alignStepsWithTranscription(
            sourcesWithTimestamp.map((s) => ({ id: s.id, timestamp_start: s.timestamp_start })),
            segments
          );

          for (const a of aligned) {
            if (a.textContent) {
              transcriptionBySourceId.set(a.stepId, a.textContent);
            }
          }
        }
      }
    } catch (error) {
      console.log('Transcription not available:', error);
      // Continue without transcription - it's optional context
    }

    // 8. Generate signed URLs for all screenshots
    const screenshotPaths = sources
      .filter((s) => s.screenshot_url)
      .map((s) => s.screenshot_url as string);

    const signedUrlResults = await Promise.all(
      screenshotPaths.map((path) =>
        supabase.storage.from('screenshots').createSignedUrl(path, 300) // 5 min validity
      )
    );

    const signedUrlMap = new Map<string, string>();
    screenshotPaths.forEach((path, index) => {
      const result = signedUrlResults[index];
      if (result.data?.signedUrl) {
        signedUrlMap.set(path, result.data.signedUrl);
      }
    });

    // 8. Fetch images and convert to base64
    const sourcesWithImages = await Promise.all(
      sources.map(async (source) => {
        let base64Image: string | null = null;

        if (source.screenshot_url) {
          const signedUrl = signedUrlMap.get(source.screenshot_url);
          if (signedUrl) {
            base64Image = await fetchImageAsBase64(signedUrl);
          }
        }

        // Parse element_info if it's a string
        const elementInfo: ElementInfo | null =
          source.element_info && typeof source.element_info === 'string'
            ? JSON.parse(source.element_info)
            : (source.element_info as ElementInfo | null);

        return {
          ...source,
          base64Image,
          element_info: elementInfo,
          transcription: transcriptionBySourceId.get(source.id) || stepTextBySourceId.get(source.id) || null,
        };
      })
    );

    // Filter out sources without images (we need images for multimodal)
    const validSources = sourcesWithImages.filter((s) => s.base64Image);

    if (validSources.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Could not load any screenshots', code: 'INTERNAL_ERROR' } as GenerateTutorialErrorResponse,
        { status: 500 }
      );
    }

    // 9. Build multimodal content for Claude
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userContent: any[] = [
      {
        type: 'text',
        text: `Generate tutorial content for a workflow with ${validSources.length} steps.

Current title: ${tutorial.title || 'None (please generate one)'}
Current description: ${tutorial.description || 'None (please generate one)'}

Here are the steps in order:`,
      },
    ];

    // Add each source with its image and context
    for (let i = 0; i < validSources.length; i++) {
      const source = validSources[i];

      // Add image
      userContent.push({
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/png',
          data: source.base64Image,
        },
      });

      // Add context text
      const contextParts: string[] = [`Step ${i + 1}:`, `- Source ID: ${source.id}`];

      if (source.url) {
        contextParts.push(`- URL: ${source.url}`);
      }

      if (source.click_x != null && source.click_y != null) {
        contextParts.push(`- Click position: (${source.click_x}, ${source.click_y})`);
        if (source.viewport_width && source.viewport_height) {
          const relX = ((source.click_x / source.viewport_width) * 100).toFixed(1);
          const relY = ((source.click_y / source.viewport_height) * 100).toFixed(1);
          contextParts.push(`- Click position (relative): ${relX}% from left, ${relY}% from top`);
        }
      }

      if (source.click_type) {
        contextParts.push(`- Action type: ${source.click_type}`);
      }

      if (source.element_info) {
        const el = source.element_info;
        const elementDesc: string[] = [];
        if (el.tag) elementDesc.push(`<${el.tag}>`);
        if (el.text) elementDesc.push(`"${el.text.substring(0, 100)}${el.text.length > 100 ? '...' : ''}"`);
        if (el.id) elementDesc.push(`id="${el.id}"`);
        if (el.className) elementDesc.push(`class="${el.className.substring(0, 50)}"`);
        if (el.tabTitle) elementDesc.push(`tab: "${el.tabTitle}"`);

        if (elementDesc.length > 0) {
          contextParts.push(`- Clicked element: ${elementDesc.join(' ')}`);
        }
      }

      if (source.transcription) {
        contextParts.push(`- User narration: "${source.transcription}"`);
      }

      userContent.push({
        type: 'text',
        text: contextParts.join('\n'),
      });
    }

    // 10. Call Claude API with structured output
    const anthropic = getAnthropicClient();
    const systemPrompt = getGenerationSystemPrompt(options);

    const response = await anthropic.messages.create({
      model: GENERATION_MODEL,
      max_tokens: GENERATION_CONFIG.maxTokens,
      temperature: GENERATION_CONFIG.temperature,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userContent,
        },
      ],
      // Use tool for structured output (Claude's recommended approach)
      tools: [
        {
          name: 'generate_tutorial',
          description: 'Generate structured tutorial content',
          input_schema: TUTORIAL_GENERATION_SCHEMA.schema,
        },
      ],
      tool_choice: { type: 'tool', name: 'generate_tutorial' },
    });

    // 11. Extract the generated content from tool use
    const toolUseBlock = response.content.find((block) => block.type === 'tool_use');

    if (!toolUseBlock || toolUseBlock.type !== 'tool_use') {
      console.error('No tool use in response:', response.content);
      return NextResponse.json(
        { success: false, error: 'Generation failed - invalid response format', code: 'GENERATION_FAILED' } as GenerateTutorialErrorResponse,
        { status: 500 }
      );
    }

    const generated = toolUseBlock.input as GeneratedTutorialContent;

    // Validate the generated content
    if (!generated.title || !generated.description || !Array.isArray(generated.steps)) {
      console.error('Invalid generated content:', generated);
      return NextResponse.json(
        { success: false, error: 'Generation failed - invalid content structure', code: 'GENERATION_FAILED' } as GenerateTutorialErrorResponse,
        { status: 500 }
      );
    }

    // 12. Return success response
    const processingTimeMs = Date.now() - startTime;

    const successResponse: GenerateTutorialResponse = {
      success: true,
      generated,
      metadata: {
        modelUsed: GENERATION_MODEL,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        processingTimeMs,
      },
    };

    return NextResponse.json(successResponse);
  } catch (error) {
    console.error('Generation error:', error);

    // Check for rate limiting
    if (error instanceof Error && error.message.includes('rate_limit')) {
      return NextResponse.json(
        { success: false, error: 'Rate limited. Please try again in a few minutes.', code: 'RATE_LIMITED' } as GenerateTutorialErrorResponse,
        { status: 429 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error', code: 'INTERNAL_ERROR' } as GenerateTutorialErrorResponse,
      { status: 500 }
    );
  }
}
