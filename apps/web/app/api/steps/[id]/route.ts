import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { flattenStepIfShared } from '@/lib/flatten/cache';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the step to find its tutorial
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select('*, tutorials!inner(user_id)')
      .eq('id', id)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // 3. Check ownership via tutorial
    const tutorial = step.tutorials as { user_id: string };
    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // 4. Parse request body
    const body = await request.json();
    const { text_content, description, annotations, source_id, url, show_url } = body;

    // Build update object with only provided fields
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: { text_content?: string; description?: string | null; annotations?: any; source_id?: string | null; url?: string | null; show_url?: boolean } = {};

    if (text_content !== undefined) {
      if (typeof text_content !== 'string') {
        return NextResponse.json({ error: 'Invalid text_content' }, { status: 400 });
      }
      updateData.text_content = text_content;
    }

    if (description !== undefined) {
      if (description !== null && typeof description !== 'string') {
        return NextResponse.json({ error: 'Invalid description' }, { status: 400 });
      }
      updateData.description = description;
    }

    if (annotations !== undefined) {
      if (!Array.isArray(annotations)) {
        return NextResponse.json({ error: 'Invalid annotations' }, { status: 400 });
      }
      updateData.annotations = annotations;
    }

    // Handle source_id changes (null to remove image, or new source_id to add/change image)
    if (source_id !== undefined) {
      if (source_id !== null && typeof source_id !== 'string') {
        return NextResponse.json({ error: 'Invalid source_id' }, { status: 400 });
      }
      updateData.source_id = source_id;
      // Clear annotations when removing the image
      if (source_id === null) {
        updateData.annotations = null;
      }
    }

    // Handle URL updates
    if (url !== undefined) {
      if (url !== null && typeof url !== 'string') {
        return NextResponse.json({ error: 'Invalid url' }, { status: 400 });
      }
      updateData.url = url;
    }

    // Handle show_url toggle
    if (show_url !== undefined) {
      if (typeof show_url !== 'boolean') {
        return NextResponse.json({ error: 'Invalid show_url' }, { status: 400 });
      }
      updateData.show_url = show_url;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // 5. Update step
    const { data: updatedStep, error: updateError } = await supabase
      .from('steps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update step:', updateError);
      return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
    }

    // If annotations changed and the parent tutorial is shared, re-flatten the
    // image so the next public view picks up the new content-hashed path.
    // Best-effort: do not block the PATCH response.
    if (annotations !== undefined) {
      flattenStepIfShared(id).catch((err) => {
        console.error('flatten: background re-flatten failed', err);
      });
    }

    return NextResponse.json({ step: updatedStep });
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createClient();

    // 1. Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Get the step to find its tutorial and screenshot
    const { data: step, error: stepError } = await supabase
      .from('steps')
      .select('*, tutorials!inner(user_id)')
      .eq('id', id)
      .single();

    if (stepError || !step) {
      return NextResponse.json({ error: 'Step not found' }, { status: 404 });
    }

    // 3. Check ownership via tutorial
    const tutorial = step.tutorials as { user_id: string };
    if (tutorial.user_id !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Note: We don't delete the source or its screenshot when deleting a step
    // Sources can be reused by multiple steps

    // 4. Delete the step
    const { error: deleteError } = await supabase
      .from('steps')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Failed to delete step:', deleteError);
      return NextResponse.json({ error: 'Failed to delete step' }, { status: 500 });
    }

    // 5. Reindex remaining steps for this tutorial
    if (!step.tutorial_id) {
      return NextResponse.json({ success: true });
    }

    const { data: remainingSteps, error: fetchError } = await supabase
      .from('steps')
      .select('id')
      .eq('tutorial_id', step.tutorial_id)
      .order('order_index', { ascending: true });

    if (!fetchError && remainingSteps) {
      const updatePromises = remainingSteps.map((s, index) =>
        supabase
          .from('steps')
          .update({ order_index: index })
          .eq('id', s.id)
      );
      await Promise.all(updatePromises);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting step:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
