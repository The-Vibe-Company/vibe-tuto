import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

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
    const { text_content } = body;

    if (typeof text_content !== 'string') {
      return NextResponse.json({ error: 'Invalid text_content' }, { status: 400 });
    }

    // 5. Update step
    const { data: updatedStep, error: updateError } = await supabase
      .from('steps')
      .update({ text_content })
      .eq('id', id)
      .select()
      .single();

    if (updateError) {
      console.error('Failed to update step:', updateError);
      return NextResponse.json({ error: 'Failed to update step' }, { status: 500 });
    }

    return NextResponse.json({ step: updatedStep });
  } catch (error) {
    console.error('Error updating step:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
