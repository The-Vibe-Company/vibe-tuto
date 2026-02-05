'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { findAnnotationAtPoint, moveAnnotation, getAnnotationBounds } from '@/lib/utils/annotation-hit-test';

interface AnnotationCanvasProps {
  annotations: Annotation[];
  activeTool: AnnotationType | null;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation?: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
}

const ANNOTATION_COLOR = '#e63946';
const SELECTION_COLOR = '#8b5cf6';
const HIGHLIGHT_COLOR = 'rgba(244, 211, 94, 0.4)';
const BLUR_RADIUS = 10;

export function AnnotationCanvas({
  annotations,
  activeTool,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  containerRef,
  readOnly = false,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  // Get relative position (0-1) from mouse event
  const getRelativePosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      return {
        x: (e.clientX - rect.left) / rect.width,
        y: (e.clientY - rect.top) / rect.height,
      };
    },
    []
  );

  // Draw selection indicator around an annotation
  const drawSelectionIndicator = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation, width: number, height: number) => {
      const bounds = getAnnotationBounds(annotation);
      const padding = 5;

      const x = bounds.minX * width - padding;
      const y = bounds.minY * height - padding;
      const w = (bounds.maxX - bounds.minX) * width + padding * 2;
      const h = (bounds.maxY - bounds.minY) * height + padding * 2;

      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      const handleSize = 8;
      ctx.fillStyle = SELECTION_COLOR;
      const corners = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ];
      corners.forEach(([cx, cy]) => {
        ctx.fillRect(cx - handleSize / 2, cy - handleSize / 2, handleSize, handleSize);
      });
    },
    []
  );

  // Draw hover indicator
  const drawHoverIndicator = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation, width: number, height: number) => {
      const bounds = getAnnotationBounds(annotation);
      const padding = 3;

      const x = bounds.minX * width - padding;
      const y = bounds.minY * height - padding;
      const w = (bounds.maxX - bounds.minX) * width + padding * 2;
      const h = (bounds.maxY - bounds.minY) * height + padding * 2;

      ctx.setLineDash([2, 2]);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.5)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    },
    []
  );

  // Draw all annotations - reads directly from props/state
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const width = canvas.width;
    const height = canvas.height;

    annotations.forEach((ann) => {
      const x = ann.x * width;
      const y = ann.y * height;

      switch (ann.type) {
        case 'circle': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;
          ctx.strokeStyle = ann.color || ANNOTATION_COLOR;
          ctx.lineWidth = 3;
          ctx.beginPath();
          ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'arrow': {
          const endX = (ann.endX || ann.x + 0.1) * width;
          const endY = (ann.endY || ann.y) * height;
          drawArrow(ctx, x, y, endX, endY, ann.color || ANNOTATION_COLOR);
          break;
        }
        case 'text': {
          ctx.font = '16px Inter, sans-serif';
          ctx.fillStyle = ann.color || ANNOTATION_COLOR;
          ctx.fillText(ann.content || 'Texte', x, y);
          break;
        }
        case 'highlight': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.05) * height;
          ctx.fillStyle = HIGHLIGHT_COLOR;
          ctx.fillRect(x, y, w, h);
          break;
        }
        case 'blur': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;
          ctx.fillStyle = 'rgba(128, 128, 128, 0.8)';
          ctx.filter = `blur(${BLUR_RADIUS}px)`;
          ctx.fillRect(x, y, w, h);
          ctx.filter = 'none';
          break;
        }
        case 'click-indicator': {
          const size = 28;
          ctx.save();
          ctx.translate(x - 4, y - 4);
          ctx.scale(size / 24, size / 24);
          ctx.fillStyle = ann.color || '#8b5cf6';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5 / (size / 24);
          ctx.beginPath();
          ctx.moveTo(3, 3);
          ctx.lineTo(10.07, 19.97);
          ctx.lineTo(12.58, 12.58);
          ctx.lineTo(19.97, 10.07);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
          ctx.restore();
          break;
        }
      }

      // Draw hover indicator (only if not readOnly)
      if (!readOnly && hoveredAnnotationId === ann.id && selectedAnnotationId !== ann.id) {
        drawHoverIndicator(ctx, ann, width, height);
      }

      // Draw selection indicator (only if not readOnly)
      if (!readOnly && selectedAnnotationId === ann.id) {
        drawSelectionIndicator(ctx, ann, width, height);
      }
    });

    // Draw current drawing preview
    if (isDrawing && startPos && currentPos && activeTool) {
      const startX = startPos.x * width;
      const startY = startPos.y * height;
      const currX = currentPos.x * width;
      const currY = currentPos.y * height;

      ctx.setLineDash([5, 5]);
      ctx.strokeStyle = ANNOTATION_COLOR;
      ctx.lineWidth = 2;

      switch (activeTool) {
        case 'circle': {
          const w = Math.abs(currX - startX);
          const h = Math.abs(currY - startY);
          const cx = Math.min(startX, currX) + w / 2;
          const cy = Math.min(startY, currY) + h / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'arrow': {
          drawArrow(ctx, startX, startY, currX, currY, ANNOTATION_COLOR, true);
          break;
        }
        case 'highlight':
        case 'blur': {
          ctx.strokeRect(
            Math.min(startX, currX),
            Math.min(startY, currY),
            Math.abs(currX - startX),
            Math.abs(currY - startY)
          );
          break;
        }
      }

      ctx.setLineDash([]);
    }
  }, [annotations, isDrawing, startPos, currentPos, activeTool, selectedAnnotationId, hoveredAnnotationId, readOnly, drawHoverIndicator, drawSelectionIndicator]);

  // Resize canvas to match container and redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    // Initial size setup
    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawAnnotations();
    }

    // Handle resize
    const resizeObserver = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) {
          canvas.width = width;
          canvas.height = height;
          drawAnnotations();
        }
      }
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [containerRef, drawAnnotations]);

  // Redraw when annotations or state changes
  useEffect(() => {
    drawAnnotations();
  }, [drawAnnotations]);

  // Handle keyboard events for deletion
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedAnnotationId && onDeleteAnnotation) {
        e.preventDefault();
        onDeleteAnnotation(selectedAnnotationId);
        setSelectedAnnotationId(null);
      }
      if (e.key === 'Escape') {
        setSelectedAnnotationId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAnnotationId, onDeleteAnnotation, readOnly]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = getRelativePosition(e);
    if (!pos) return;

    if (activeTool) {
      if (activeTool === 'text') {
        const content = window.prompt('Texte de l\'annotation:');
        if (content) {
          onAddAnnotation({
            id: crypto.randomUUID(),
            type: 'text',
            x: pos.x,
            y: pos.y,
            content,
            color: ANNOTATION_COLOR,
          });
        }
        return;
      }

      setIsDrawing(true);
      setStartPos(pos);
      setCurrentPos(pos);
      return;
    }

    const hitAnnotationId = findAnnotationAtPoint(annotations, pos);

    if (hitAnnotationId) {
      if (selectedAnnotationId === hitAnnotationId) {
        setIsDragging(true);
        setDragStartPos(pos);
      } else {
        setSelectedAnnotationId(hitAnnotationId);
      }
    } else {
      setSelectedAnnotationId(null);
    }
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = getRelativePosition(e);
    if (!pos) return;

    if (isDrawing && activeTool) {
      setCurrentPos(pos);
      return;
    }

    if (isDragging && dragStartPos && selectedAnnotationId && onUpdateAnnotation) {
      const deltaX = pos.x - dragStartPos.x;
      const deltaY = pos.y - dragStartPos.y;

      const annotation = annotations.find((a) => a.id === selectedAnnotationId);
      if (annotation) {
        const moved = moveAnnotation(annotation, deltaX, deltaY);
        onUpdateAnnotation(selectedAnnotationId, {
          x: moved.x,
          y: moved.y,
          endX: moved.endX,
          endY: moved.endY,
        });
        setDragStartPos(pos);
      }
      return;
    }

    if (!activeTool) {
      const hitAnnotationId = findAnnotationAtPoint(annotations, pos);
      setHoveredAnnotationId(hitAnnotationId);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && startPos && currentPos && activeTool) {
      const annotation: Annotation = {
        id: crypto.randomUUID(),
        type: activeTool,
        x: Math.min(startPos.x, currentPos.x),
        y: Math.min(startPos.y, currentPos.y),
        color: ANNOTATION_COLOR,
      };

      switch (activeTool) {
        case 'circle':
        case 'highlight':
        case 'blur':
          annotation.width = Math.abs(currentPos.x - startPos.x);
          annotation.height = Math.abs(currentPos.y - startPos.y);
          break;
        case 'arrow':
          annotation.x = startPos.x;
          annotation.y = startPos.y;
          annotation.endX = currentPos.x;
          annotation.endY = currentPos.y;
          break;
      }

      const minSize = 0.01;
      if (
        activeTool === 'arrow' ||
        (annotation.width && annotation.width > minSize) ||
        (annotation.height && annotation.height > minSize)
      ) {
        onAddAnnotation(annotation);
      }
    }

    setIsDrawing(false);
    setStartPos(null);
    setCurrentPos(null);
    setIsDragging(false);
    setDragStartPos(null);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredAnnotationId(null);
  };

  const getCursorStyle = () => {
    if (readOnly) return 'default';
    if (activeTool) return 'crosshair';
    if (isDragging) return 'grabbing';
    if (hoveredAnnotationId) return 'pointer';
    if (selectedAnnotationId && hoveredAnnotationId === selectedAnnotationId) return 'grab';
    return 'default';
  };

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0"
      style={{ cursor: getCursorStyle(), pointerEvents: readOnly ? 'none' : 'auto' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      tabIndex={readOnly ? -1 : 0}
    />
  );
}

function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string,
  dashed = false
) {
  const headLength = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  if (dashed) {
    ctx.setLineDash([5, 5]);
  }

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.PI / 6),
    toY - headLength * Math.sin(angle - Math.PI / 6)
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.PI / 6),
    toY - headLength * Math.sin(angle + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
}
