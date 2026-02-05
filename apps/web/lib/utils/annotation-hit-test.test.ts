import { describe, it, expect } from 'vitest';
import {
  hitTestAnnotation,
  getAnnotationBounds,
  moveAnnotation,
  hitTestCorner,
  findAnnotationAtPoint,
} from './annotation-hit-test';
import type { Annotation } from '@/lib/types/editor';

function makeAnnotation(overrides: Partial<Annotation> & { id: string; type: Annotation['type']; x: number; y: number }): Annotation {
  return overrides as Annotation;
}

describe('hitTestAnnotation', () => {
  describe('circle', () => {
    const circle = makeAnnotation({
      id: 'c1',
      type: 'circle',
      x: 0.3,
      y: 0.3,
      width: 0.2,
      height: 0.2,
    });

    it('hits on the ellipse border', () => {
      // Right edge of ellipse: cx=0.4, cy=0.4, rx=0.1, ry=0.1
      expect(hitTestAnnotation(circle, { x: 0.5, y: 0.4 })).toBe(true);
    });

    it('misses far from the ellipse', () => {
      expect(hitTestAnnotation(circle, { x: 0.0, y: 0.0 })).toBe(false);
    });

    it('misses at the center (not on border)', () => {
      // Center point should miss since only border is tested
      expect(hitTestAnnotation(circle, { x: 0.4, y: 0.4 })).toBe(false);
    });
  });

  describe('arrow', () => {
    const arrow = makeAnnotation({
      id: 'a1',
      type: 'arrow',
      x: 0.1,
      y: 0.1,
      endX: 0.9,
      endY: 0.9,
    });

    it('hits near the line', () => {
      // Midpoint of the line
      expect(hitTestAnnotation(arrow, { x: 0.5, y: 0.5 })).toBe(true);
    });

    it('misses far from the line', () => {
      expect(hitTestAnnotation(arrow, { x: 0.1, y: 0.9 })).toBe(false);
    });

    it('hits near the start point', () => {
      expect(hitTestAnnotation(arrow, { x: 0.1, y: 0.1 })).toBe(true);
    });

    it('hits near the end point', () => {
      expect(hitTestAnnotation(arrow, { x: 0.9, y: 0.9 })).toBe(true);
    });
  });

  describe('text', () => {
    const text = makeAnnotation({
      id: 't1',
      type: 'text',
      x: 0.3,
      y: 0.5,
      content: 'Hello',
    });

    it('hits within the text bounding box', () => {
      expect(hitTestAnnotation(text, { x: 0.35, y: 0.49 })).toBe(true);
    });

    it('misses outside the bounding box', () => {
      expect(hitTestAnnotation(text, { x: 0.0, y: 0.0 })).toBe(false);
    });
  });

  describe('highlight', () => {
    const highlight = makeAnnotation({
      id: 'h1',
      type: 'highlight',
      x: 0.2,
      y: 0.2,
      width: 0.3,
      height: 0.3,
    });

    it('hits inside the rectangle', () => {
      expect(hitTestAnnotation(highlight, { x: 0.35, y: 0.35 })).toBe(true);
    });

    it('misses outside the rectangle', () => {
      expect(hitTestAnnotation(highlight, { x: 0.0, y: 0.0 })).toBe(false);
    });
  });

  describe('blur', () => {
    const blur = makeAnnotation({
      id: 'b1',
      type: 'blur',
      x: 0.4,
      y: 0.4,
      width: 0.2,
      height: 0.2,
    });

    it('hits inside the rectangle', () => {
      expect(hitTestAnnotation(blur, { x: 0.5, y: 0.5 })).toBe(true);
    });

    it('misses outside', () => {
      expect(hitTestAnnotation(blur, { x: 0.1, y: 0.1 })).toBe(false);
    });
  });

  describe('click-indicator', () => {
    const indicator = makeAnnotation({
      id: 'ci1',
      type: 'click-indicator',
      x: 0.5,
      y: 0.5,
    });

    it('hits within the hit radius', () => {
      expect(hitTestAnnotation(indicator, { x: 0.5, y: 0.5 })).toBe(true);
      expect(hitTestAnnotation(indicator, { x: 0.52, y: 0.5 })).toBe(true);
    });

    it('misses outside the hit radius', () => {
      expect(hitTestAnnotation(indicator, { x: 0.6, y: 0.6 })).toBe(false);
    });
  });

  describe('numbered-callout', () => {
    const callout = makeAnnotation({
      id: 'nc1',
      type: 'numbered-callout',
      x: 0.5,
      y: 0.5,
      calloutNumber: 1,
    });

    it('hits within the hit radius', () => {
      expect(hitTestAnnotation(callout, { x: 0.5, y: 0.5 })).toBe(true);
    });

    it('misses outside the hit radius', () => {
      expect(hitTestAnnotation(callout, { x: 0.7, y: 0.7 })).toBe(false);
    });
  });

  describe('unknown type', () => {
    it('returns false for unknown annotation type', () => {
      const unknown = { id: 'u1', type: 'unknown' as any, x: 0.5, y: 0.5 };
      expect(hitTestAnnotation(unknown, { x: 0.5, y: 0.5 })).toBe(false);
    });
  });
});

describe('getAnnotationBounds', () => {
  it('returns bounds for circle', () => {
    const circle = makeAnnotation({ id: 'c1', type: 'circle', x: 0.2, y: 0.3, width: 0.4, height: 0.2 });
    const bounds = getAnnotationBounds(circle);
    expect(bounds.minX).toBeCloseTo(0.2);
    expect(bounds.minY).toBeCloseTo(0.3);
    expect(bounds.maxX).toBeCloseTo(0.6);
    expect(bounds.maxY).toBeCloseTo(0.5);
  });

  it('returns bounds for highlight', () => {
    const highlight = makeAnnotation({ id: 'h1', type: 'highlight', x: 0.1, y: 0.1, width: 0.5, height: 0.3 });
    const bounds = getAnnotationBounds(highlight);
    expect(bounds).toEqual({ minX: 0.1, minY: 0.1, maxX: 0.6, maxY: 0.4 });
  });

  it('returns bounds for blur', () => {
    const blur = makeAnnotation({ id: 'b1', type: 'blur', x: 0.0, y: 0.0, width: 1.0, height: 1.0 });
    const bounds = getAnnotationBounds(blur);
    expect(bounds).toEqual({ minX: 0.0, minY: 0.0, maxX: 1.0, maxY: 1.0 });
  });

  it('uses default dimensions when width/height missing', () => {
    const circle = makeAnnotation({ id: 'c1', type: 'circle', x: 0.5, y: 0.5 });
    const bounds = getAnnotationBounds(circle);
    expect(bounds).toEqual({ minX: 0.5, minY: 0.5, maxX: 0.6, maxY: 0.6 });
  });

  it('returns bounds for arrow', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.1, y: 0.2, endX: 0.8, endY: 0.9 });
    const bounds = getAnnotationBounds(arrow);
    expect(bounds).toEqual({ minX: 0.1, minY: 0.2, maxX: 0.8, maxY: 0.9 });
  });

  it('handles arrow with reversed coordinates', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.8, y: 0.9, endX: 0.1, endY: 0.2 });
    const bounds = getAnnotationBounds(arrow);
    expect(bounds).toEqual({ minX: 0.1, minY: 0.2, maxX: 0.8, maxY: 0.9 });
  });

  it('returns default end for arrow without endX/endY', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.3, y: 0.4 });
    const bounds = getAnnotationBounds(arrow);
    expect(bounds.maxX).toBeCloseTo(0.4);
    expect(bounds.minY).toBe(0.4);
  });

  it('returns bounds for text', () => {
    const text = makeAnnotation({ id: 't1', type: 'text', x: 0.5, y: 0.5 });
    const bounds = getAnnotationBounds(text);
    expect(bounds).toEqual({ minX: 0.5, minY: 0.47, maxX: 0.65, maxY: 0.5 });
  });

  it('returns bounds for click-indicator', () => {
    const indicator = makeAnnotation({ id: 'ci1', type: 'click-indicator', x: 0.5, y: 0.5 });
    const bounds = getAnnotationBounds(indicator);
    expect(bounds).toEqual({ minX: 0.47, minY: 0.47, maxX: 0.53, maxY: 0.53 });
  });

  it('returns bounds for numbered-callout', () => {
    const callout = makeAnnotation({ id: 'nc1', type: 'numbered-callout', x: 0.5, y: 0.5 });
    const bounds = getAnnotationBounds(callout);
    expect(bounds).toEqual({ minX: 0.475, minY: 0.475, maxX: 0.525, maxY: 0.525 });
  });

  it('returns default bounds for unknown type', () => {
    const unknown = { id: 'u1', type: 'unknown' as any, x: 0.5, y: 0.5 };
    const bounds = getAnnotationBounds(unknown);
    expect(bounds).toEqual({ minX: 0.5, minY: 0.5, maxX: 0.6, maxY: 0.6 });
  });
});

describe('moveAnnotation', () => {
  it('moves a simple annotation by delta', () => {
    const ann = makeAnnotation({ id: 'a1', type: 'highlight', x: 0.2, y: 0.3, width: 0.1, height: 0.1 });
    const moved = moveAnnotation(ann, 0.1, 0.05);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.35);
  });

  it('moves arrow start and end points', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.1, y: 0.1, endX: 0.5, endY: 0.5 });
    const moved = moveAnnotation(arrow, 0.2, 0.3);
    expect(moved.x).toBeCloseTo(0.3);
    expect(moved.y).toBeCloseTo(0.4);
    expect(moved.endX).toBeCloseTo(0.7);
    expect(moved.endY).toBeCloseTo(0.8);
  });

  it('does not move endX/endY for non-arrow types', () => {
    const circle = makeAnnotation({ id: 'c1', type: 'circle', x: 0.5, y: 0.5, width: 0.2, height: 0.2 });
    const moved = moveAnnotation(circle, -0.1, -0.1);
    expect(moved.x).toBeCloseTo(0.4);
    expect(moved.y).toBeCloseTo(0.4);
    expect(moved.endX).toBeUndefined();
    expect(moved.endY).toBeUndefined();
  });

  it('does not mutate the original annotation', () => {
    const ann = makeAnnotation({ id: 'a1', type: 'blur', x: 0.5, y: 0.5, width: 0.1, height: 0.1 });
    moveAnnotation(ann, 0.1, 0.1);
    expect(ann.x).toBe(0.5);
    expect(ann.y).toBe(0.5);
  });

  it('handles arrow without endX/endY', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.3, y: 0.3 });
    const moved = moveAnnotation(arrow, 0.1, 0.1);
    expect(moved.x).toBeCloseTo(0.4);
    expect(moved.y).toBeCloseTo(0.4);
    // endX/endY should not be set since they were undefined
    expect(moved.endX).toBeUndefined();
  });
});

describe('hitTestCorner', () => {
  const rect = makeAnnotation({
    id: 'r1',
    type: 'highlight',
    x: 0.2,
    y: 0.2,
    width: 0.4,
    height: 0.3,
  });

  it('detects nw corner', () => {
    expect(hitTestCorner(rect, { x: 0.2, y: 0.2 })).toBe('nw');
  });

  it('detects ne corner', () => {
    expect(hitTestCorner(rect, { x: 0.6, y: 0.2 })).toBe('ne');
  });

  it('detects sw corner', () => {
    expect(hitTestCorner(rect, { x: 0.2, y: 0.5 })).toBe('sw');
  });

  it('detects se corner', () => {
    expect(hitTestCorner(rect, { x: 0.6, y: 0.5 })).toBe('se');
  });

  it('returns null when not near any corner', () => {
    expect(hitTestCorner(rect, { x: 0.4, y: 0.35 })).toBeNull();
  });

  it('returns null for non-resizable types like arrow', () => {
    const arrow = makeAnnotation({ id: 'a1', type: 'arrow', x: 0.2, y: 0.2, endX: 0.6, endY: 0.5 });
    expect(hitTestCorner(arrow, { x: 0.2, y: 0.2 })).toBeNull();
  });

  it('returns null for text type', () => {
    const text = makeAnnotation({ id: 't1', type: 'text', x: 0.2, y: 0.2 });
    expect(hitTestCorner(text, { x: 0.2, y: 0.2 })).toBeNull();
  });

  it('returns null for click-indicator type', () => {
    const indicator = makeAnnotation({ id: 'ci1', type: 'click-indicator', x: 0.5, y: 0.5 });
    expect(hitTestCorner(indicator, { x: 0.5, y: 0.5 })).toBeNull();
  });

  it('works with circle type', () => {
    const circle = makeAnnotation({ id: 'c1', type: 'circle', x: 0.2, y: 0.2, width: 0.4, height: 0.3 });
    expect(hitTestCorner(circle, { x: 0.2, y: 0.2 })).toBe('nw');
  });

  it('works with blur type', () => {
    const blur = makeAnnotation({ id: 'b1', type: 'blur', x: 0.2, y: 0.2, width: 0.4, height: 0.3 });
    expect(hitTestCorner(blur, { x: 0.6, y: 0.5 })).toBe('se');
  });

  it('respects custom tolerance', () => {
    // Point far from corner but within large tolerance
    expect(hitTestCorner(rect, { x: 0.25, y: 0.25 }, 0.1)).toBe('nw');
    // Same point with small tolerance
    expect(hitTestCorner(rect, { x: 0.25, y: 0.25 }, 0.01)).toBeNull();
  });
});

describe('findAnnotationAtPoint', () => {
  const annotations: Annotation[] = [
    makeAnnotation({ id: 'h1', type: 'highlight', x: 0.0, y: 0.0, width: 0.5, height: 0.5 }),
    makeAnnotation({ id: 'h2', type: 'highlight', x: 0.3, y: 0.3, width: 0.5, height: 0.5 }),
  ];

  it('returns topmost (last) annotation at a point', () => {
    // Both annotations overlap at (0.35, 0.35)
    const result = findAnnotationAtPoint(annotations, { x: 0.35, y: 0.35 });
    expect(result).toBe('h2');
  });

  it('returns the only matching annotation', () => {
    // Only first annotation at (0.1, 0.1)
    const result = findAnnotationAtPoint(annotations, { x: 0.1, y: 0.1 });
    expect(result).toBe('h1');
  });

  it('returns null when no annotation at point', () => {
    const result = findAnnotationAtPoint(annotations, { x: 0.9, y: 0.9 });
    expect(result).toBeNull();
  });

  it('returns null for empty annotations array', () => {
    const result = findAnnotationAtPoint([], { x: 0.5, y: 0.5 });
    expect(result).toBeNull();
  });
});
