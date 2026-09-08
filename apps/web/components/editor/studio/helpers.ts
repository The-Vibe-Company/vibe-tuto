import type { StepWithSignedUrl, SourceWithSignedUrl } from '@/lib/types/editor';
import { getSourceActionType } from '@/lib/types/editor';

export type ActionDotColor = '#ef5a3a' | '#2f7a4d' | '#c08a2a';

export const ACTION_DOT_FALLBACK: ActionDotColor = '#c08a2a';

/** Maps a step's effective action to the prototype's color scheme. */
export function actionDotColor(step: StepWithSignedUrl): ActionDotColor {
  const action = stepAction(step);
  if (action === 'click') return '#ef5a3a';
  if (action === 'type') return '#2f7a4d';
  return ACTION_DOT_FALLBACK;
}

export function stepAction(step: StepWithSignedUrl): string {
  if (step.source) {
    return getSourceActionType(step.source as SourceWithSignedUrl);
  }
  if (step.step_type === 'image') return 'click';
  if (step.step_type === 'text') return 'note';
  return step.step_type;
}

/** Group consecutive non-heading steps under their preceding heading.
   Steps before the first heading become an implicit "Steps" chapter. */
export interface Chapter {
  id: string;
  label: string;
  items: StepWithSignedUrl[];
  /** True if this chapter was created implicitly (no real heading step). */
  implicit?: boolean;
}

export function chaptersOf(steps: StepWithSignedUrl[]): Chapter[] {
  const out: Chapter[] = [];
  let cur: Chapter | null = null;
  for (const s of steps) {
    if (s.step_type === 'heading') {
      cur = {
        id: s.id,
        label: s.text_content?.trim() || 'Section',
        items: [],
      };
      out.push(cur);
    } else {
      if (!cur) {
        cur = { id: '__implicit__', label: 'Steps', items: [], implicit: true };
        out.push(cur);
      }
      cur.items.push(s);
    }
  }
  return out;
}

/** Indices of "screenshot-like" steps for the bottom playhead and step counter.
   Mirrors DocEditor's behavior: image + text steps count, headings/dividers don't. */
export function playheadSteps(steps: StepWithSignedUrl[]): StepWithSignedUrl[] {
  return steps.filter(
    (s) => s.step_type === 'image' || s.step_type === 'text'
  );
}

export function formatHostFromUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const u = new URL(url);
    return u.host + (u.pathname !== '/' ? u.pathname : '');
  } catch {
    return url;
  }
}
