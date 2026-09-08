import type { StepWithSignedUrl } from '@/lib/types/editor';

/** Public readers receive flattened previews, never raw storage URLs or captured metadata. */
export function publicPresentationSteps(steps: StepWithSignedUrl[], token: string | null): StepWithSignedUrl[] {
  return steps.map(step => ({
    id: step.id,
    tutorial_id: step.tutorial_id,
    source_id: null,
    order_index: step.order_index,
    text_content: step.text_content,
    description: step.description,
    step_type: step.step_type,
    created_at: step.created_at,
    annotations: [],
    signedScreenshotUrl: token && step.signedScreenshotUrl ? `/api/public/tutorials/${encodeURIComponent(token)}/steps/${encodeURIComponent(step.id)}/preview` : null,
    source: null,
    click_x: null,
    click_y: null,
    viewport_width: step.viewport_width,
    viewport_height: step.viewport_height,
    element_info: null,
    url: step.show_url === false ? null : step.url,
    show_url: step.show_url,
  }));
}
