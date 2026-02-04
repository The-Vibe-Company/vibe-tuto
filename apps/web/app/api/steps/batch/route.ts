import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

interface StepUpdate {
  id: string;
  text_content?: string;
  annotations?: unknown[];
  order_index?: number;
  source_id?: string | null;
}

interface BatchUpdateBody {
  tutorialId: string;
  updates: StepUpdate[];
}

/**
 * Batch update multiple steps in a single request.
 * Reduces network round trips when updating multiple steps at once.
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse request body
    const body: BatchUpdateBody = await request.json();
    const { tutorialId, updates } = body;

    if (!tutorialId || typeof tutorialId !== 'string') {
      return NextResponse.json({ error: 'tutorialId is required' }, { status: 400 });
    }

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'updates must be a non-empty array' }, { status: 400 });
    }

    // Limit batch size to prevent abuse
    if (updates.length > 100) {
      return NextResponse.json({ error: 'Maximum 100 updates per batch' }, { status: 400 });
    }

    // 3. Verify tutorial ownership
    const { data: tutorial, error: tutorialError } = await supabase
      .from('tutorials')
      .select('id, user_id')
      .eq('id', tutorialId)
      .single();

    if (tutorialError || !tutorial) {
      return NextResponse.json({ error: 'Tutorial not found' }, { status: 404 });
    }

    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Verify all steps belong to this tutorial
    const stepIds = updates.map(u => u.id);
    const { data: existingSteps, error: stepsError } = await supabase
      .from('steps')
      .select('id')
      .eq('tutorial_id', tutorialId)
      .in('id', stepIds);

    if (stepsError) {
      console.error('Error fetching steps:', stepsError);
      return NextResponse.json({ error: 'Failed to verify steps' }, { status: 500 });
    }

    const existingStepIds = new Set(existingSteps?.map(s => s.id) || []);
    const invalidIds = stepIds.filter(id => !existingStepIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Invalid step IDs provided', invalidIds },
        { status: 400 }
      );
    }

    // 5. Build update promises
    const updatePromises = updates.map(update => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const updateData: Record<string, any> = {};

      if (update.text_content !== undefined) {
        updateData.text_content = update.text_content;
      }
      if (update.annotations !== undefined) {
        updateData.annotations = update.annotations;
      }
      if (update.order_index !== undefined) {
        updateData.order_index = update.order_index;
      }
      if (update.source_id !== undefined) {
        updateData.source_id = update.source_id;
        // Clear annotations when removing image
        if (update.source_id === null && update.annotations === undefined) {
          updateData.annotations = null;
        }
      }

      // Skip if no updates
      if (Object.keys(updateData).length === 0) {
        return Promise.resolve({ data: null, error: null, skipped: true });
      }

      return supabase
        .from('steps')
        .update(updateData)
        .eq('id', update.id)
        .eq('tutorial_id', tutorialId)
        .select()
        .single();
    });

    // 6. Execute all updates in parallel
    const results = await Promise.all(updatePromises);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error('Errors updating steps:', errors.map(e => e.error));
      // Still return success for partial updates
      const successCount = results.filter(r => !r.error && !('skipped' in r && r.skipped)).length;
      return NextResponse.json({
        success: true,
        partial: true,
        updated: successCount,
        failed: errors.length,
      });
    }

    const updatedSteps = results
      .filter(r => r.data)
      .map(r => r.data);

    return NextResponse.json({
      success: true,
      steps: updatedSteps,
    });
  } catch (error) {
    console.error('Error batch updating steps:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
