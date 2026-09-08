import { describe, it, expect } from 'vitest';
import { annotationSchema, upsertStepsSchema } from './schema';

describe('agent annotation contract', () => {
  it('accepts a rectangle in image coordinates and an arrow ending at the image origin', () => {
    expect(annotationSchema.parse({ id:'box', type:'rectangle', x:0.2, y:0.1, width:0.3, height:0.2 }).width).toBe(0.3);
    expect(annotationSchema.parse({ id:'arrow', type:'arrow', x:0.5, y:0.5, endX:0, endY:0 }).endX).toBe(0);
  });
  it('rejects geometry that cannot be rendered inside the source', () => {
    expect(annotationSchema.safeParse({ id:'box', type:'rectangle', x:0.9, y:0, width:0.2, height:0.1 }).success).toBe(false);
    expect(annotationSchema.safeParse({ id:'arrow', type:'arrow', x:0, y:0 }).success).toBe(false);
    expect(annotationSchema.safeParse({ id:'bad', type:'text', x:0, y:0, content:'hello', color:'url(https://example.com)' }).success).toBe(false);
  });
  it('rejects image steps without an actual captured source', () => {
    expect(upsertStepsSchema.safeParse([{id:crypto.randomUUID(),source_id:null,step_type:'image',order_index:0,text_content:'Click'}]).success).toBe(false);
  });
});
