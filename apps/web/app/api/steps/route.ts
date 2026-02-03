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
    const { tutorial_id, order_index, click_type, text_content } = body;

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
      // Get all steps that need to be shifted
      const { data: stepsToShift } = await supabase
        .from('steps')
        .select('id, order_index')
        .eq('tutorial_id', tutorial_id)
        .gte('order_index', order_index)
        .order('order_index', { ascending: false });

      // Update each step's order_index (starting from highest to avoid conflicts)
      if (stepsToShift) {
        for (const step of stepsToShift) {
          await supabase
            .from('steps')
            .update({ order_index: step.order_index + 1 })
            .eq('id', step.id);
        }
      }
    }

    // Create the new step
    const { data: step, error: insertError } = await supabase
      .from('steps')
      .insert({
        tutorial_id,
        order_index: newOrderIndex,
        click_type: click_type || 'text',
        text_content: text_content || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Failed to create step:', insertError);
      return NextResponse.json(
        { error: 'Failed to create step' },
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
