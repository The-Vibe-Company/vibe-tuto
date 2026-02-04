import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

// POST /api/steps - Create a new step
export async function POST(request: Request) {
  try {
    const supabase = await createClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const {
      tutorial_id,
      source_id,
      order_index,
      step_type,
      text_content,
      annotations,
    } = body;

    if (!tutorial_id) {
      return NextResponse.json(
        { error: 'tutorial_id is required' },
        { status: 400 }
      );
    }

    // Verify the tutorial belongs to this user
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id')
      .eq('id', tutorial_id)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If source_id is provided, verify it exists and belongs to the same tutorial
    // Note: Using type assertion due to regenerated types not including all columns
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let source: any = null;
    if (source_id) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: sourceData, error: sourceError } = await (supabase as any)
        .from('sources')
        .select('*')
        .eq('id', source_id)
        .eq('tutorial_id', tutorial_id)
        .single();

      if (sourceError || !sourceData) {
        return NextResponse.json({ error: 'Source not found' }, { status: 404 });
      }
      source = sourceData;
    }

    // Get the current max order_index for this tutorial
    const { data: existingSteps } = await supabase
      .from('steps')
      .select('order_index')
      .eq('tutorial_id', tutorial_id)
      .order('order_index', { ascending: false })
      .limit(1);

    const maxOrderIndex = existingSteps?.[0]?.order_index ?? -1;
    const newOrderIndex = order_index ?? maxOrderIndex + 1;

    // If inserting in the middle, shift subsequent steps
    if (order_index !== undefined && order_index <= maxOrderIndex) {
      const { data: stepsToShift } = await supabase
        .from('steps')
        .select('id, order_index')
        .eq('tutorial_id', tutorial_id)
        .gte('order_index', order_index)
        .order('order_index', { ascending: false });

      if (stepsToShift) {
        for (const step of stepsToShift) {
          await supabase
            .from('steps')
            .update({ order_index: step.order_index + 1 })
            .eq('id', step.id);
        }
      }
    }

    // Determine step_type based on source_id or provided type
    const finalStepType = step_type || (source_id ? 'image' : 'text');

    // Build insert object
    const insertData: Record<string, unknown> = {
      tutorial_id,
      order_index: newOrderIndex,
      step_type: finalStepType,
    };

    // Add optional fields
    if (source_id) insertData.source_id = source_id;
    if (text_content) insertData.text_content = text_content;

    // Handle annotations
    // If source has click coordinates and no annotations provided, create click-indicator
    if (source && !annotations) {
      if (source.click_x != null && source.click_y != null &&
          source.viewport_width && source.viewport_height) {
        insertData.annotations = [
          {
            id: crypto.randomUUID(),
            type: 'click-indicator',
            x: source.click_x / source.viewport_width,
            y: source.click_y / source.viewport_height,
            color: '#8b5cf6',
          },
        ];
      }
    } else if (annotations) {
      insertData.annotations = annotations;
    }

    // Generate auto-caption from source if no text_content provided
    if (!text_content && source) {
      // Check if it's a navigation event
      if (source.click_type === 'navigation' && source.url) {
        // Generate "Navigate to domain.com/path" caption
        let pageDesc = source.url;
        try {
          const parsed = new URL(source.url);
          const path = parsed.pathname !== '/' ? parsed.pathname : '';
          pageDesc = parsed.hostname + path;
        } catch {
          // Keep original URL if parsing fails
        }
        insertData.text_content = `Navigate to <strong>${pageDesc}</strong>`;
      }
      // Otherwise check for element_info (click events)
      else if (source.element_info) {
        const elementInfo = typeof source.element_info === 'string'
          ? JSON.parse(source.element_info)
          : source.element_info;

        if (elementInfo?.text) {
          const cleanText = elementInfo.text.replace(/\s+/g, ' ').trim().slice(0, 50);
          insertData.text_content = `Click on <strong>${cleanText}</strong>`;
        }
      }
    }

    // Create the new step
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: step, error: insertError } = await supabase
      .from('steps')
      .insert(insertData as any)
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create step:', insertError);
      return NextResponse.json(
        { error: 'Failed to create step', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ step });
  } catch (error) {
    console.error('Error creating step:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
