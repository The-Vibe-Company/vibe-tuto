'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { findAnnotationAtPoint, moveAnnotation, getAnnotationBounds, hitTestCorner, type ResizeCorner } from '@/lib/utils/annotation-hit-test';
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
const PIXELATE_BLOCK_SIZE = 12; // Size of each pixelated block in pixels

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
  const [isResizing, setIsResizing] = useState(false);
  const [resizeCorner, setResizeCorner] = useState<ResizeCorner | null>(null);
  const [resizeStartPos, setResizeStartPos] = useState<{ x: number; y: number } | null>(null);
  const [hoveredCorner, setHoveredCorner] = useState<ResizeCorner | null>(null);
  const [textInputState, setTextInputState] = useState<{ x: number; y: number } | null>(null);
  const textInputRef = useRef<HTMLInputElement>(null);

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
      const handleRadius = 5;
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

          // Pixelate effect: read underlying image, scale down then up
          // Canvas is inside a wrapper div → go up to the container to find the <img>
          const imgEl = containerRef.current?.querySelector('img') as HTMLImageElement | null;
          if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
            try {
              ctx.save();
              // Clip to rounded rect
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 6);
              ctx.clip();

              // Calculate how many pixel blocks fit
              const blockSize = PIXELATE_BLOCK_SIZE;
              const smallW = Math.max(1, Math.ceil(w / blockSize));
              const smallH = Math.max(1, Math.ceil(h / blockSize));

              // Use offscreen canvas to pixelate
              const offscreen = document.createElement('canvas');
              offscreen.width = smallW;
              offscreen.height = smallH;
              const offCtx = offscreen.getContext('2d');
              if (offCtx) {
                // Calculate source region from the image's natural dimensions
                const scaleX = imgEl.naturalWidth / width;
                const scaleY = imgEl.naturalHeight / height;
                // Draw the source region scaled down (this averages the pixels)
                offCtx.drawImage(
                  imgEl,
                  x * scaleX, y * scaleY, w * scaleX, h * scaleY,
                  0, 0, smallW, smallH
                );
                // Draw it back at full size without smoothing → blocky pixels
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offscreen, 0, 0, smallW, smallH, x, y, w, h);
                ctx.imageSmoothingEnabled = true;
              }
              ctx.restore();
            } catch {
              // Fallback if image can't be read (CORS etc.)
              ctx.save();
              ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 6);
              ctx.fill();
              ctx.restore();
            }
          } else {
            // Fallback: gray rectangle if image not loaded
            ctx.save();
            ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 6);
            ctx.fill();
            ctx.restore();
          }

          // Subtle border
          ctx.strokeStyle = 'rgba(160, 160, 160, 0.3)';
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

  // Redraw when underlying image loads (needed for pixelate blur effect)
  useEffect(() => {
    const hasBlur = annotations.some(a => a.type === 'blur');
    if (!hasBlur) return;

    const imgEl = containerRef.current?.querySelector('img');
    if (!imgEl) return;

    const onLoad = () => drawAnnotations();
    imgEl.addEventListener('load', onLoad);
    // Also handle decode completion
    if (imgEl.complete) drawAnnotations();
    return () => imgEl.removeEventListener('load', onLoad);
  }, [annotations, containerRef, drawAnnotations]);

  // Handle keyboard events for deletion
  useEffect(() => {
    if (readOnly) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (textInputState) return;
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
  }, [selectedAnnotationId, onDeleteAnnotation, readOnly, textInputState]);

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return;
    const pos = getRelativePosition(e);
    if (!pos) return;

    if (activeTool) {
      // Check resize corners on selected annotation first (corners may be outside body hit area)
      if (selectedAnnotationId) {
        const selectedAnn = annotations.find(a => a.id === selectedAnnotationId);
        if (selectedAnn) {
          const corner = hitTestCorner(selectedAnn, pos);
          if (corner) {
            setIsResizing(true);
            setResizeCorner(corner);
            setResizeStartPos(pos);
            return;
          }
        }
      }

      // Check if clicking on an existing annotation → select it instead of drawing
      const hitId = findAnnotationAtPoint(annotations, pos);
      if (hitId) {
        if (hitId === selectedAnnotationId) {
          // Start dragging
          setIsDragging(true);
          setDragStartPos(pos);
          return;
        }
        setSelectedAnnotationId(hitId);
        return;
      }

      if (activeTool === 'text') {
        setTextInputState({ x: pos.x, y: pos.y });
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

    // Check resize corners on selected annotation first (corners may be outside body hit area)
    if (selectedAnnotationId) {
      const selectedAnn = annotations.find(a => a.id === selectedAnnotationId);
      if (selectedAnn) {
        const corner = hitTestCorner(selectedAnn, pos);
        if (corner) {
          setIsResizing(true);
          setResizeCorner(corner);
          setResizeStartPos(pos);
          return;
        }
      }
    }

    const hitAnnotationId = findAnnotationAtPoint(annotations, pos);

    if (hitAnnotationId) {
      if (selectedAnnotationId === hitAnnotationId) {
        // Start dragging
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

    if (isResizing && resizeCorner && resizeStartPos && selectedAnnotationId && onUpdateAnnotation) {
      const annotation = annotations.find(a => a.id === selectedAnnotationId);
      if (annotation) {
        let newX = annotation.x;
        let newY = annotation.y;
        let newW = annotation.width || 0.1;
        let newH = annotation.height || 0.1;

        switch (resizeCorner) {
          case 'se':
            newW = Math.max(0.02, pos.x - annotation.x);
            newH = Math.max(0.02, pos.y - annotation.y);
            break;
          case 'sw':
            newW = Math.max(0.02, (annotation.x + newW) - pos.x);
            newH = Math.max(0.02, pos.y - annotation.y);
            newX = pos.x;
            break;
          case 'ne':
            newW = Math.max(0.02, pos.x - annotation.x);
            newH = Math.max(0.02, (annotation.y + newH) - pos.y);
            newY = pos.y;
            break;
          case 'nw':
            newW = Math.max(0.02, (annotation.x + newW) - pos.x);
            newH = Math.max(0.02, (annotation.y + newH) - pos.y);
            newX = pos.x;
            newY = pos.y;
            break;
        }

        onUpdateAnnotation(selectedAnnotationId, { x: newX, y: newY, width: newW, height: newH });
        setResizeStartPos(pos);
      }
      return;
    }

    const hitAnnotationId = findAnnotationAtPoint(annotations, pos);
    setHoveredAnnotationId(hitAnnotationId);

    // Corner hover detection for resize cursor
    if (selectedAnnotationId) {
      const selectedAnn = annotations.find(a => a.id === selectedAnnotationId);
      if (selectedAnn) {
        setHoveredCorner(hitTestCorner(selectedAnn, pos));
      } else {
        setHoveredCorner(null);
      }
    } else {
      setHoveredCorner(null);
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
    setIsResizing(false);
    setResizeCorner(null);
    setResizeStartPos(null);
  };

  const handleMouseLeave = () => {
    handleMouseUp();
    setHoveredAnnotationId(null);
  };

  const handleTextInputConfirm = useCallback((content: string) => {
    if (content.trim() && textInputState) {
      onAddAnnotation({
        id: crypto.randomUUID(),
        type: 'text',
        x: textInputState.x,
        y: textInputState.y,
        content: content.trim(),
        color: style.color,
        fontSize: style.fontSize,
        textBackground: style.textBackground,
      });
    }
    setTextInputState(null);
  }, [textInputState, onAddAnnotation, style.color, style.fontSize, style.textBackground]);

  const handleTextInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      handleTextInputConfirm((e.target as HTMLInputElement).value);
    } else if (e.key === 'Escape') {
      setTextInputState(null);
    }
  }, [handleTextInputConfirm]);

  useEffect(() => {
    if (textInputState && textInputRef.current) {
      textInputRef.current.focus();
    }
  }, [textInputState]);

  const getCursorStyle = () => {
    if (readOnly) return 'default';
    if (isResizing) return resizeCorner === 'nw' || resizeCorner === 'se' ? 'nwse-resize' : 'nesw-resize';
    // Resize corners take priority over everything (including active tool)
    if (hoveredCorner) return hoveredCorner === 'nw' || hoveredCorner === 'se' ? 'nwse-resize' : 'nesw-resize';
    if (isDragging) return 'grabbing';
    if (activeTool) return hoveredAnnotationId ? 'pointer' : 'crosshair';
    if (hoveredAnnotationId) return 'pointer';
    if (selectedAnnotationId && hoveredAnnotationId === selectedAnnotationId) return 'grab';
    return 'default';
  };

  return (
    <div className="absolute inset-0">
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
      {textInputState && (
        <input
          ref={textInputRef}
          type="text"
          placeholder="Type annotation text..."
          className="absolute z-10 rounded border border-primary bg-background/95 px-2 py-1 text-sm shadow-lg outline-none ring-2 ring-primary/30 backdrop-blur-sm"
          style={{
            left: `${textInputState.x * 100}%`,
            top: `${textInputState.y * 100}%`,
            transform: 'translateY(-50%)',
            minWidth: '150px',
            maxWidth: '300px',
          }}
          onKeyDown={handleTextInputKeyDown}
          onBlur={(e) => handleTextInputConfirm(e.target.value)}
        />
      )}
    </div>
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
