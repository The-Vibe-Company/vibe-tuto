import { z } from 'zod';

const coordinate = z.number().finite().min(0).max(1);
export const annotationSchema = z.object({
  id: z.string().min(1).max(100),
  type: z.enum(['circle', 'rectangle', 'arrow', 'text', 'blur', 'highlight', 'click-indicator', 'numbered-callout']),
  x: coordinate, y: coordinate,
  width: coordinate.optional(), height: coordinate.optional(),
  endX: coordinate.optional(), endY: coordinate.optional(),
  content: z.string().max(2000).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
  strokeWidth: z.number().int().min(1).max(3).optional(),
  fontSize: z.number().int().min(10).max(48).optional(),
  opacity: coordinate.optional(),
  textBackground: z.enum(['pill', 'rectangle', 'none']).optional(),
  calloutNumber: z.number().int().min(1).max(999).optional(),
}).strict().superRefine((a, ctx) => {
  const fail = (message: string) => ctx.addIssue({ code: 'custom', message });
  if (a.type === 'arrow' && (a.endX === undefined || a.endY === undefined)) fail('Arrow requires endX and endY');
  if (['circle', 'rectangle', 'blur', 'highlight'].includes(a.type)) {
    if (!a.width || !a.height) fail('Shape requires positive width and height');
    if (a.x + (a.width ?? 0) > 1.000001 || a.y + (a.height ?? 0) > 1.000001) fail('Shape extends outside the image');
  }
  if (a.type === 'text' && !a.content?.trim()) fail('Text annotation requires content');
});
export const stepSchema = z.object({
  id: z.string().uuid().describe('Stable UUID. Reuse it to update this step or retry safely.'),
  source_id: z.string().uuid().nullable(),
  order_index: z.number().int().min(0).max(9999),
  step_type: z.enum(['image', 'text', 'heading', 'divider']),
  text_content: z.string().max(20000).nullable(),
  description: z.string().max(20000).nullable().optional(),
  annotations: z.array(annotationSchema).max(100).default([]),
}).strict().refine(s => s.step_type !== 'image' || s.source_id !== null, 'Image step requires a source');
export const upsertStepsSchema = z.array(stepSchema).min(1).max(100)
  .refine(steps => new Set(steps.map(s => s.id)).size === steps.length, 'Duplicate step IDs');
