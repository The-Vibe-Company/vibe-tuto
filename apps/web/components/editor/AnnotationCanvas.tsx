'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { findAnnotationAtPoint, moveAnnotation, getAnnotationBounds } from '@/lib/utils/annotation-hit-test';
import { getStrokePx, DEFAULT_ANNOTATION_STYLE } from '@/lib/constants/annotation-styles';
import type { AnnotationStyle } from './AnnotationToolbar';

interface AnnotationCanvasProps {
  annotations: Annotation[];
  activeTool: AnnotationType | null;
  onAddAnnotation: (annotation: Annotation) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation?: (id: string) => void;
  containerRef: React.RefObject<HTMLDivElement | null>;
  readOnly?: boolean;
  annotationStyle?: AnnotationStyle;
}

const SELECTION_COLOR = '#8b5cf6';
const BLUR_RADIUS = 10;

// Auto-incrementing callout counter
let nextCalloutNumber = 1;

export function AnnotationCanvas({
  annotations,
  activeTool,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  containerRef,
  readOnly = false,
  annotationStyle,
}: AnnotationCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentPos, setCurrentPos] = useState<{ x: number; y: number } | null>(null);
  const [selectedAnnotationId, setSelectedAnnotationId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredAnnotationId, setHoveredAnnotationId] = useState<string | null>(null);

  const style = annotationStyle || {
    color: DEFAULT_ANNOTATION_STYLE.color,
    strokeWidth: DEFAULT_ANNOTATION_STYLE.strokeWidth,
    fontSize: DEFAULT_ANNOTATION_STYLE.fontSize,
    opacity: DEFAULT_ANNOTATION_STYLE.opacity,
    textBackground: DEFAULT_ANNOTATION_STYLE.textBackground,
  };

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
      const padding = 6;

      const x = bounds.minX * width - padding;
      const y = bounds.minY * height - padding;
      const w = (bounds.maxX - bounds.minX) * width + padding * 2;
      const h = (bounds.maxY - bounds.minY) * height + padding * 2;

      // Dashed selection border
      ctx.setLineDash([4, 4]);
      ctx.strokeStyle = SELECTION_COLOR;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);

      // Corner handles - filled circles with shadow
      const handleRadius = 4;
      const corners = [
        [x, y],
        [x + w, y],
        [x, y + h],
        [x + w, y + h],
      ];

      corners.forEach(([cx, cy]) => {
        // Shadow
        ctx.beginPath();
        ctx.arc(cx, cy, handleRadius + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();

        // Handle fill
        ctx.beginPath();
        ctx.arc(cx, cy, handleRadius, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.strokeStyle = SELECTION_COLOR;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    },
    []
  );

  // Draw hover indicator
  const drawHoverIndicator = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation, width: number, height: number) => {
      const bounds = getAnnotationBounds(annotation);
      const padding = 4;

      const x = bounds.minX * width - padding;
      const y = bounds.minY * height - padding;
      const w = (bounds.maxX - bounds.minX) * width + padding * 2;
      const h = (bounds.maxY - bounds.minY) * height + padding * 2;

      ctx.setLineDash([3, 3]);
      ctx.strokeStyle = 'rgba(139, 92, 246, 0.4)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.roundRect(x, y, w, h, 4);
      ctx.stroke();
      ctx.setLineDash([]);
    },
    []
  );

  // Draw all annotations
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
      const annColor = ann.color || DEFAULT_ANNOTATION_STYLE.color;
      const annStroke = getStrokePx(ann.strokeWidth);
      const annFontSize = ann.fontSize || DEFAULT_ANNOTATION_STYLE.fontSize;
      const annOpacity = ann.opacity ?? DEFAULT_ANNOTATION_STYLE.opacity;
      const annTextBg = ann.textBackground || DEFAULT_ANNOTATION_STYLE.textBackground;

      switch (ann.type) {
        case 'circle': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;
          const cx = x + w / 2;
          const cy = y + h / 2;

          // Outer glow
          ctx.save();
          ctx.shadowColor = annColor;
          ctx.shadowBlur = 6;
          ctx.shadowOffsetX = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = annColor;
          ctx.lineWidth = annStroke;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, 2 * Math.PI);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'arrow': {
          const endX = (ann.endX || ann.x + 0.1) * width;
          const endY = (ann.endY || ann.y) * height;
          drawArrow(ctx, x, y, endX, endY, annColor, annStroke, false);
          break;
        }
        case 'text': {
          const scaledFont = annFontSize;
          ctx.font = `600 ${scaledFont}px Inter, system-ui, sans-serif`;
          const text = ann.content || 'Text';
          const metrics = ctx.measureText(text);
          const textHeight = scaledFont;
          const padX = 8;
          const padY = 4;

          if (annTextBg !== 'none') {
            const bgX = x - padX;
            const bgY = y - textHeight - padY;
            const bgW = metrics.width + padX * 2;
            const bgH = textHeight + padY * 2;

            // Background with rounded corners
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
            ctx.shadowBlur = 4;
            ctx.shadowOffsetY = 1;

            ctx.fillStyle = annColor;
            ctx.beginPath();
            if (annTextBg === 'pill') {
              ctx.roundRect(bgX, bgY, bgW, bgH, bgH / 2);
            } else {
              ctx.roundRect(bgX, bgY, bgW, bgH, 4);
            }
            ctx.fill();
            ctx.restore();

            // White text on colored background
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x, y - padY);
          } else {
            // Colored text with subtle text shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 3;
            ctx.shadowOffsetX = 0;
            ctx.shadowOffsetY = 1;
            ctx.fillStyle = annColor;
            ctx.fillText(text, x, y);
            ctx.restore();
          }
          break;
        }
        case 'numbered-callout': {
          const num = ann.calloutNumber || 1;
          const radius = Math.max((ann.fontSize || 16), 16);

          // Shadow
          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 6;
          ctx.shadowOffsetY = 2;

          // Filled circle
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = annColor;
          ctx.fill();
          ctx.restore();

          // White border
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Number text
          const numStr = String(num);
          ctx.font = `700 ${radius}px Inter, system-ui, sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(numStr, x, y + 1);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
          break;
        }
        case 'highlight': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.05) * height;

          // Parse the color and apply opacity
          ctx.save();
          ctx.globalAlpha = annOpacity;

          // Rounded highlight rectangle
          ctx.fillStyle = annColor;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 4);
          ctx.fill();

          ctx.restore();
          break;
        }
        case 'blur': {
          const w = (ann.width || 0.1) * width;
          const h = (ann.height || 0.1) * height;

          // Frosted glass blur effect
          ctx.save();
          ctx.filter = `blur(${BLUR_RADIUS}px)`;
          ctx.fillStyle = 'rgba(128, 128, 128, 0.85)';
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.fill();
          ctx.filter = 'none';
          ctx.restore();

          // Subtle border around blur area
          ctx.strokeStyle = 'rgba(128, 128, 128, 0.3)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6);
          ctx.stroke();
          break;
        }
        case 'click-indicator': {
          const size = 30;
          const scl = size / 24;
          const tipOffset = scl * 3;

          // Outer pulse ring
          ctx.save();
          ctx.beginPath();
          ctx.arc(x, y, 18, 0, Math.PI * 2);
          ctx.fillStyle = `${ann.color || '#8b5cf6'}20`;
          ctx.fill();
          ctx.strokeStyle = `${ann.color || '#8b5cf6'}40`;
          ctx.lineWidth = 1.5;
          ctx.stroke();
          ctx.restore();

          // Cursor shape
          ctx.save();
          ctx.translate(x - tipOffset, y - tipOffset);
          ctx.scale(scl, scl);

          // Shadow
          ctx.shadowColor = 'rgba(0, 0, 0, 0.25)';
          ctx.shadowBlur = 4;
          ctx.shadowOffsetY = 2;

          ctx.fillStyle = ann.color || '#8b5cf6';
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.5 / scl;
          ctx.lineJoin = 'round';
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
      ctx.strokeStyle = style.color;
      ctx.lineWidth = 2;

      switch (activeTool) {
        case 'circle': {
          const w = Math.abs(currX - startX);
          const h = Math.abs(currY - startY);
          const cx = Math.min(startX, currX) + w / 2;
          const cy = Math.min(startY, currY) + h / 2;
          ctx.beginPath();
          ctx.ellipse(cx, cy, Math.max(w / 2, 1), Math.max(h / 2, 1), 0, 0, 2 * Math.PI);
          ctx.stroke();
          break;
        }
        case 'arrow': {
          drawArrow(ctx, startX, startY, currX, currY, style.color, getStrokePx(style.strokeWidth), true);
          break;
        }
        case 'highlight':
        case 'blur': {
          ctx.beginPath();
          ctx.roundRect(
            Math.min(startX, currX),
            Math.min(startY, currY),
            Math.abs(currX - startX),
            Math.abs(currY - startY),
            4
          );
          ctx.stroke();
          break;
        }
        case 'numbered-callout': {
          // Preview as circle at start position
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(startX, startY, Math.max(style.fontSize, 16), 0, Math.PI * 2);
          ctx.strokeStyle = style.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
      }

      ctx.setLineDash([]);
    }
  }, [annotations, isDrawing, startPos, currentPos, activeTool, selectedAnnotationId, hoveredAnnotationId, readOnly, drawHoverIndicator, drawSelectionIndicator, style.color, style.strokeWidth, style.fontSize]);

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
        const content = window.prompt('Annotation text:');
        if (content) {
          onAddAnnotation({
            id: crypto.randomUUID(),
            type: 'text',
            x: pos.x,
            y: pos.y,
            content,
            color: style.color,
            fontSize: style.fontSize,
            textBackground: style.textBackground,
          });
        }
        return;
      }

      if (activeTool === 'numbered-callout') {
        // Calculate next callout number based on existing callouts
        const existingCallouts = annotations.filter((a) => a.type === 'numbered-callout');
        const maxNum = existingCallouts.reduce((max, a) => Math.max(max, a.calloutNumber || 0), 0);
        nextCalloutNumber = maxNum + 1;

        onAddAnnotation({
          id: crypto.randomUUID(),
          type: 'numbered-callout',
          x: pos.x,
          y: pos.y,
          color: style.color,
          fontSize: style.fontSize,
          calloutNumber: nextCalloutNumber,
        });
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
        color: style.color,
        strokeWidth: style.strokeWidth,
      };

      switch (activeTool) {
        case 'circle':
          annotation.width = Math.abs(currentPos.x - startPos.x);
          annotation.height = Math.abs(currentPos.y - startPos.y);
          break;
        case 'highlight':
          annotation.width = Math.abs(currentPos.x - startPos.x);
          annotation.height = Math.abs(currentPos.y - startPos.y);
          annotation.opacity = style.opacity;
          break;
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
  strokePx: number,
  dashed = false
) {
  const lineLength = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const headLength = Math.min(Math.max(lineLength * 0.2, 10), 20);
  const headWidth = headLength * 0.6;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  // Line (draw up to where arrowhead starts)
  const lineEndX = toX - headLength * Math.cos(angle);
  const lineEndY = toY - headLength * Math.sin(angle);

  ctx.save();

  if (!dashed) {
    // Subtle shadow for depth
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 3;
    ctx.shadowOffsetY = 1;
  }

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = strokePx;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (dashed) {
    ctx.setLineDash([5, 5]);
  }

  // Draw line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

  // Draw filled arrowhead (triangle)
  ctx.beginPath();
  ctx.moveTo(toX, toY);
  ctx.lineTo(
    toX - headLength * Math.cos(angle - Math.atan2(headWidth, headLength)),
    toY - headLength * Math.sin(angle - Math.atan2(headWidth, headLength))
  );
  ctx.lineTo(
    toX - headLength * Math.cos(angle + Math.atan2(headWidth, headLength)),
    toY - headLength * Math.sin(angle + Math.atan2(headWidth, headLength))
  );
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}
