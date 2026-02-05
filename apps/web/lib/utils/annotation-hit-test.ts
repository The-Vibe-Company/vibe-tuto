import type { Annotation } from '@/lib/types/editor';

/**
 * Check if a point is inside an annotation
 * All coordinates are in relative 0-1 space
 */
export function hitTestAnnotation(
  annotation: Annotation,
  point: { x: number; y: number }
): boolean {
  switch (annotation.type) {
    case 'circle':
      return hitTestEllipse(annotation, point);
    case 'arrow':
      return hitTestArrow(annotation, point);
    case 'text':
      return hitTestText(annotation, point);
    case 'highlight':
    case 'blur':
      return hitTestRect(annotation, point);
    case 'click-indicator':
      return hitTestClickIndicator(annotation, point);
    case 'numbered-callout':
      return hitTestClickIndicator(annotation, point);
    default:
      return false;
  }
}

/**
 * Get the bounding box of an annotation in relative 0-1 space
 */
export function getAnnotationBounds(annotation: Annotation): {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
} {
  switch (annotation.type) {
    case 'circle':
    case 'highlight':
    case 'blur': {
      const width = annotation.width || 0.1;
      const height = annotation.height || 0.1;
      return {
        minX: annotation.x,
        minY: annotation.y,
        maxX: annotation.x + width,
        maxY: annotation.y + height,
      };
    }
    case 'arrow': {
      const endX = annotation.endX ?? annotation.x + 0.1;
      const endY = annotation.endY ?? annotation.y;
      return {
        minX: Math.min(annotation.x, endX),
        minY: Math.min(annotation.y, endY),
        maxX: Math.max(annotation.x, endX),
        maxY: Math.max(annotation.y, endY),
      };
    }
    case 'text': {
      // Approximate text bounding box
      const width = 0.15; // Approximation
      const height = 0.03;
      return {
        minX: annotation.x,
        minY: annotation.y - height,
        maxX: annotation.x + width,
        maxY: annotation.y,
      };
    }
    case 'click-indicator': {
      // Small bounding box around cursor
      const size = 0.04;
      return {
        minX: annotation.x - size / 2,
        minY: annotation.y - size / 2,
        maxX: annotation.x + size / 2,
        maxY: annotation.y + size / 2,
      };
    }
    case 'numbered-callout': {
      const size = 0.05;
      return {
        minX: annotation.x - size / 2,
        minY: annotation.y - size / 2,
        maxX: annotation.x + size / 2,
        maxY: annotation.y + size / 2,
      };
    }
    default:
      return {
        minX: annotation.x,
        minY: annotation.y,
        maxX: annotation.x + 0.1,
        maxY: annotation.y + 0.1,
      };
  }
}

/**
 * Move an annotation by a delta amount
 */
export function moveAnnotation(
  annotation: Annotation,
  deltaX: number,
  deltaY: number
): Annotation {
  const moved = { ...annotation, x: annotation.x + deltaX, y: annotation.y + deltaY };

  // For arrows, also move the end point
  if (annotation.type === 'arrow' && annotation.endX !== undefined && annotation.endY !== undefined) {
    moved.endX = annotation.endX + deltaX;
    moved.endY = annotation.endY + deltaY;
  }

  return moved;
}

// Hit test for ellipse/circle
function hitTestEllipse(annotation: Annotation, point: { x: number; y: number }): boolean {
  const width = annotation.width || 0.1;
  const height = annotation.height || 0.1;
  const cx = annotation.x + width / 2;
  const cy = annotation.y + height / 2;
  const rx = width / 2;
  const ry = height / 2;

  // Ellipse equation: ((x-cx)/rx)^2 + ((y-cy)/ry)^2 <= 1
  const dx = (point.x - cx) / rx;
  const dy = (point.y - cy) / ry;

  // Also check stroke area (add some tolerance)
  const tolerance = 0.02;
  const distance = dx * dx + dy * dy;

  // Hit if point is near the ellipse border (not just inside)
  return distance <= 1 + tolerance && distance >= Math.max(0, 1 - tolerance * 4);
}

// Hit test for arrow (line proximity)
function hitTestArrow(annotation: Annotation, point: { x: number; y: number }): boolean {
  const threshold = 0.025; // 2.5% of canvas tolerance

  const startX = annotation.x;
  const startY = annotation.y;
  const endX = annotation.endX ?? annotation.x + 0.1;
  const endY = annotation.endY ?? annotation.y;

  // Distance from point to line segment
  const distance = pointToLineDistance(point, { x: startX, y: startY }, { x: endX, y: endY });

  return distance < threshold;
}

// Hit test for text (bounding box)
function hitTestText(annotation: Annotation, point: { x: number; y: number }): boolean {
  // Approximate text bounding box
  const width = 0.15;
  const height = 0.04;

  return (
    point.x >= annotation.x &&
    point.x <= annotation.x + width &&
    point.y >= annotation.y - height &&
    point.y <= annotation.y + height / 2
  );
}

// Hit test for rectangle (highlight, blur)
function hitTestRect(annotation: Annotation, point: { x: number; y: number }): boolean {
  const width = annotation.width || 0.1;
  const height = annotation.height || 0.1;

  return (
    point.x >= annotation.x &&
    point.x <= annotation.x + width &&
    point.y >= annotation.y &&
    point.y <= annotation.y + height
  );
}

// Hit test for click indicator (circular area around cursor)
function hitTestClickIndicator(annotation: Annotation, point: { x: number; y: number }): boolean {
  const hitRadius = 0.03; // 3% of canvas
  const dx = point.x - annotation.x;
  const dy = point.y - annotation.y;
  return Math.sqrt(dx * dx + dy * dy) < hitRadius;
}

// Calculate distance from point to line segment
function pointToLineDistance(
  point: { x: number; y: number },
  lineStart: { x: number; y: number },
  lineEnd: { x: number; y: number }
): number {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx: number;
  let yy: number;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;

  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Find the topmost annotation at a given point
 * Returns the annotation id or null if no hit
 */
export function findAnnotationAtPoint(
  annotations: Annotation[],
  point: { x: number; y: number }
): string | null {
  // Check in reverse order (last drawn = on top)
  for (let i = annotations.length - 1; i >= 0; i--) {
    if (hitTestAnnotation(annotations[i], point)) {
      return annotations[i].id;
    }
  }
  return null;
}
