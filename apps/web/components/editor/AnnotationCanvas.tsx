'use client';

import { useRef, useEffect, useState, useCallback } from 'react';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { findAnnotationAtPoint, moveAnnotation, getAnnotationBounds, hitTestCorner, type ResizeCorner } from '@/lib/utils/annotation-hit-test';
import { getStrokePx, DEFAULT_ANNOTATION_STYLE, annotationScale } from '@/lib/constants/annotation-styles';
import { getImageBounds } from '@/lib/utils/image-bounds';
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
const PIXELATE_BLOCK_SIZE = 12;

// Auto-incrementing callout counter
let nextCalloutNumber = 1;

/** Parse hex color (#rrggbb) to {r, g, b} */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '');
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

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

  // Animation refs for click-indicator pulse effect
  const animationTimeRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  // Store computed image bounds for use in text input positioning
  const imageBoundsRef = useRef({ offsetX: 0, offsetY: 0, displayWidth: 1, displayHeight: 1, canvasWidth: 1, canvasHeight: 1 });

  const style = annotationStyle || {
    color: DEFAULT_ANNOTATION_STYLE.color,
    strokeWidth: DEFAULT_ANNOTATION_STYLE.strokeWidth,
    fontSize: DEFAULT_ANNOTATION_STYLE.fontSize,
    opacity: DEFAULT_ANNOTATION_STYLE.opacity,
    textBackground: DEFAULT_ANNOTATION_STYLE.textBackground,
  };

  /** Compute the actual image bounds within the canvas (accounting for object-contain letterboxing) */
  const computeCanvasImageBounds = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return { offsetX: 0, offsetY: 0, displayWidth: 1, displayHeight: 1 };

    const imgEl = containerRef.current?.querySelector('img') as HTMLImageElement | null;
    if (!imgEl || !imgEl.complete || imgEl.naturalWidth === 0) {
      return { offsetX: 0, offsetY: 0, displayWidth: canvas.width, displayHeight: canvas.height };
    }

    return getImageBounds(canvas.width, canvas.height, imgEl.naturalWidth, imgEl.naturalHeight);
  }, [containerRef]);

  // Get relative position (0-1) from mouse event, mapped to image space
  const getRelativePosition = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return null;

      const rect = canvas.getBoundingClientRect();
      const bounds = computeCanvasImageBounds();

      // Map mouse position to image-relative coordinates (0-1)
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      const canvasX = (e.clientX - rect.left) * scaleX;
      const canvasY = (e.clientY - rect.top) * scaleY;

      return {
        x: (canvasX - bounds.offsetX) / bounds.displayWidth,
        y: (canvasY - bounds.offsetY) / bounds.displayHeight,
      };
    },
    [computeCanvasImageBounds]
  );

  // Draw selection indicator around an annotation
  const drawSelectionIndicator = useCallback(
    (ctx: CanvasRenderingContext2D, annotation: Annotation, oX: number, oY: number, dw: number, dh: number) => {
      const bounds = getAnnotationBounds(annotation);
      const padding = 6;

      const x = oX + bounds.minX * dw - padding;
      const y = oY + bounds.minY * dh - padding;
      const w = (bounds.maxX - bounds.minX) * dw + padding * 2;
      const h = (bounds.maxY - bounds.minY) * dh + padding * 2;

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
        ctx.beginPath();
        ctx.arc(cx, cy, handleRadius + 1, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
        ctx.fill();

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
    (ctx: CanvasRenderingContext2D, annotation: Annotation, oX: number, oY: number, dw: number, dh: number) => {
      const bounds = getAnnotationBounds(annotation);
      const padding = 4;

      const x = oX + bounds.minX * dw - padding;
      const y = oY + bounds.minY * dh - padding;
      const w = (bounds.maxX - bounds.minX) * dw + padding * 2;
      const h = (bounds.maxY - bounds.minY) * dh + padding * 2;

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

    // Compute image bounds to account for object-contain letterboxing
    const bounds = computeCanvasImageBounds();
    const { offsetX: oX, offsetY: oY, displayWidth: dw, displayHeight: dh } = bounds;

    // Store for text input positioning
    imageBoundsRef.current = { ...bounds, canvasWidth: canvas.width, canvasHeight: canvas.height };

    const animTime = animationTimeRef.current;
    const styleScale = annotationScale(dw);
    const fontFamily = getComputedStyle(canvas).getPropertyValue('--font-annotation').trim() || 'sans-serif';

    annotations.forEach((ann) => {
      const x = oX + ann.x * dw;
      const y = oY + ann.y * dh;
      const annColor = ann.color || DEFAULT_ANNOTATION_STYLE.color;
      const annStroke = getStrokePx(ann.strokeWidth) * styleScale;
      const annFontSize = Math.min(64, Math.max(10, ann.fontSize || DEFAULT_ANNOTATION_STYLE.fontSize)) * styleScale;
      const annOpacity = ann.opacity ?? DEFAULT_ANNOTATION_STYLE.opacity;
      const annTextBg = ann.textBackground || DEFAULT_ANNOTATION_STYLE.textBackground;

      switch (ann.type) {
        case 'circle': {
          const w = (ann.width || 0.1) * dw;
          const h = (ann.height || 0.1) * dh;
          const cx = x + w / 2;
          const cy = y + h / 2;

          ctx.save();
          ctx.shadowColor = annColor;
          ctx.shadowBlur = 0;
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
          const endX = oX + (ann.endX ?? ann.x + 0.1) * dw;
          const endY = oY + (ann.endY ?? ann.y) * dh;
          drawArrow(ctx, x, y, endX, endY, annColor, annStroke, false, styleScale);
          break;
        }
        case 'text': {
          const scaledFont = annFontSize;
          ctx.font = `400 ${scaledFont}px ${fontFamily}`;
          const text = ann.content || 'Text';
          const metrics = ctx.measureText(text);
          const textHeight = scaledFont;
          const padX = 8 * styleScale;
          const padY = 4 * styleScale;

          if (annTextBg !== 'none') {
            const bgX = x - padX;
            const bgY = y - textHeight - padY;
            const bgW = metrics.width + padX * 2;
            const bgH = textHeight + padY * 2;

            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.12)';
            ctx.shadowBlur = 0;
            ctx.shadowOffsetY = 1;

            ctx.fillStyle = annColor;
            ctx.beginPath();
            if (annTextBg === 'pill') {
              ctx.roundRect(bgX, bgY, bgW, bgH, bgH / 2);
            } else {
              ctx.roundRect(bgX, bgY, bgW, bgH, 4 * styleScale);
            }
            ctx.fill();
            ctx.restore();

            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, x, y - padY);
          } else {
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
            ctx.shadowBlur = 0;
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
          const radius = Math.max(annFontSize, 16 * styleScale);

          ctx.save();
          ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 2;

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fillStyle = annColor;
          ctx.fill();
          ctx.restore();

          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.lineWidth = 2 * styleScale;
          ctx.stroke();

          const numStr = String(num);
          ctx.font = `400 ${radius}px ${fontFamily}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'alphabetic';
          ctx.fillStyle = '#ffffff';
          ctx.fillText(numStr, x, y + radius * 0.35);
          ctx.textAlign = 'start';
          ctx.textBaseline = 'alphabetic';
          break;
        }
        case 'rectangle':
        case 'highlight': {
          const w = (ann.width || 0.1) * dw;
          const h = (ann.height || 0.05) * dh;

          ctx.save();
          ctx.globalAlpha = ann.type === 'rectangle' ? 1 : annOpacity;
          ctx.fillStyle = annColor;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 4 * styleScale);
          if (ann.type === 'rectangle') {
            ctx.strokeStyle = annColor;
            ctx.lineWidth = annStroke;
            ctx.stroke();
          } else {
            ctx.fill();
          }
          ctx.restore();
          break;
        }
        case 'blur': {
          const w = (ann.width || 0.1) * dw;
          const h = (ann.height || 0.1) * dh;

          const imgEl = containerRef.current?.querySelector('img') as HTMLImageElement | null;
          if (imgEl && imgEl.complete && imgEl.naturalWidth > 0) {
            try {
              ctx.save();
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 6 * styleScale);
              ctx.clip();

              const blockSize = PIXELATE_BLOCK_SIZE * styleScale;
              const smallW = Math.max(1, Math.ceil(w / blockSize));
              const smallH = Math.max(1, Math.ceil(h / blockSize));

              const offscreen = document.createElement('canvas');
              offscreen.width = smallW;
              offscreen.height = smallH;
              const offCtx = offscreen.getContext('2d');
              if (offCtx) {
                // Map canvas pixel coords back to natural image coords
                const scaleX = imgEl.naturalWidth / dw;
                const scaleY = imgEl.naturalHeight / dh;
                const srcX = (x - oX) * scaleX;
                const srcY = (y - oY) * scaleY;
                const srcW = w * scaleX;
                const srcH = h * scaleY;

                offCtx.drawImage(imgEl, srcX, srcY, srcW, srcH, 0, 0, smallW, smallH);
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(offscreen, 0, 0, smallW, smallH, x, y, w, h);
                ctx.imageSmoothingEnabled = true;
              }
              ctx.restore();
            } catch {
              ctx.save();
              ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
              ctx.beginPath();
              ctx.roundRect(x, y, w, h, 6 * styleScale);
              ctx.fill();
              ctx.restore();
            }
          } else {
            ctx.save();
            ctx.fillStyle = 'rgba(180, 180, 180, 0.9)';
            ctx.beginPath();
            ctx.roundRect(x, y, w, h, 6 * styleScale);
            ctx.fill();
            ctx.restore();
          }

          ctx.strokeStyle = 'rgba(160, 160, 160, 0.3)';
          ctx.lineWidth = 1 * styleScale;
          ctx.beginPath();
          ctx.roundRect(x, y, w, h, 6 * styleScale);
          ctx.stroke();
          break;
        }
        case 'click-indicator': {
          const color = annColor;
          const { r, g, b } = hexToRgb(color);

          // --- Animated ripple rings ---
          const RIPPLE_DURATION = 2000;
          const MAX_RADIUS = 28 * styleScale;
          const NUM_RIPPLES = 3;

          for (let i = 0; i < NUM_RIPPLES; i++) {
            const phase = ((animTime + i * (RIPPLE_DURATION / NUM_RIPPLES)) % RIPPLE_DURATION) / RIPPLE_DURATION;
            const radius = phase * MAX_RADIUS;
            const opacity = Math.max(0, 0.45 * (1 - phase));

            ctx.save();
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
            ctx.lineWidth = 2 * styleScale * (1 - phase * 0.5);
            ctx.stroke();
            ctx.restore();
          }

          // --- Outer glow (radial gradient) ---
          ctx.save();
          const gradient = ctx.createRadialGradient(x, y, 0, x, y, 14 * styleScale);
          gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.3)`);
          gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(x, y, 14 * styleScale, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();

          // --- Center dot with pulse ---
          const dotPulse = 1 + 0.15 * Math.sin(animTime * 0.004);
          const dotRadius = 5 * styleScale * dotPulse;

          ctx.save();
          ctx.shadowColor = `rgba(${r}, ${g}, ${b}, 0.5)`;
          ctx.shadowBlur = 0;

          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.fillStyle = color;
          ctx.fill();

          // White ring
          ctx.beginPath();
          ctx.arc(x, y, dotRadius, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
          ctx.lineWidth = 1.5 * styleScale;
          ctx.stroke();
          ctx.restore();
          break;
        }
      }

      // Draw hover indicator (only if not readOnly)
      if (!readOnly && hoveredAnnotationId === ann.id && selectedAnnotationId !== ann.id) {
        drawHoverIndicator(ctx, ann, oX, oY, dw, dh);
      }

      // Draw selection indicator (only if not readOnly)
      if (!readOnly && selectedAnnotationId === ann.id) {
        drawSelectionIndicator(ctx, ann, oX, oY, dw, dh);
      }
    });

    // Draw current drawing preview
    if (isDrawing && startPos && currentPos && activeTool) {
      const startX = oX + startPos.x * dw;
      const startY = oY + startPos.y * dh;
      const currX = oX + currentPos.x * dw;
      const currY = oY + currentPos.y * dh;

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
          drawArrow(ctx, startX, startY, currX, currY, style.color, getStrokePx(style.strokeWidth) * styleScale, true, styleScale);
          break;
        }
        case 'rectangle':
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
          ctx.setLineDash([]);
          ctx.beginPath();
          ctx.arc(startX, startY, Math.max(style.fontSize, 16) * styleScale, 0, Math.PI * 2);
          ctx.strokeStyle = style.color;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
      }

      ctx.setLineDash([]);
    }
  }, [annotations, isDrawing, startPos, currentPos, activeTool, selectedAnnotationId, hoveredAnnotationId, readOnly, drawHoverIndicator, drawSelectionIndicator, style.color, style.strokeWidth, style.fontSize, computeCanvasImageBounds, containerRef]);

  // Keep a ref to the latest drawAnnotations for the rAF loop
  const drawAnnotationsRef = useRef(drawAnnotations);
  drawAnnotationsRef.current = drawAnnotations;

  // Resize canvas to match container and redraw
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      canvas.width = rect.width;
      canvas.height = rect.height;
      drawAnnotations();
    }

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

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !document.fonts) return;
    const family = getComputedStyle(canvas).getPropertyValue('--font-annotation').trim();
    if (family) document.fonts.load(`16px ${family}`).then(() => drawAnnotationsRef.current());
  }, []);

  // Redraw when underlying image loads (needed for offset calculation + blur)
  useEffect(() => {
    const imgEl = containerRef.current?.querySelector('img');
    if (!imgEl) return;

    const onLoad = () => drawAnnotationsRef.current();
    imgEl.addEventListener('load', onLoad);
    if (imgEl.complete) drawAnnotationsRef.current();
    return () => imgEl.removeEventListener('load', onLoad);
  }, [containerRef]);

  // Animation loop for click-indicator pulse effect
  useEffect(() => {
    const hasClickIndicators = annotations.some(a => a.type === 'click-indicator');

    if (!hasClickIndicators) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      animationTimeRef.current = 0;
      return;
    }

    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      animationTimeRef.current = timestamp - startTime;
      drawAnnotationsRef.current();
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    };
  }, [annotations]);

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

      const hitId = findAnnotationAtPoint(annotations, pos);
      if (hitId) {
        if (hitId === selectedAnnotationId) {
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
        case 'rectangle':
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
    if (hoveredCorner) return hoveredCorner === 'nw' || hoveredCorner === 'se' ? 'nwse-resize' : 'nesw-resize';
    if (isDragging) return 'grabbing';
    if (activeTool) return hoveredAnnotationId ? 'pointer' : 'crosshair';
    if (hoveredAnnotationId) return 'pointer';
    if (selectedAnnotationId && hoveredAnnotationId === selectedAnnotationId) return 'grab';
    return 'default';
  };

  // Compute text input position in CSS %, mapped through image bounds
  const getTextInputPosition = () => {
    if (!textInputState) return { left: '0%', top: '0%' };
    const { offsetX: oX, offsetY: oY, displayWidth: dw, displayHeight: dh, canvasWidth: cw, canvasHeight: ch } = imageBoundsRef.current;
    const pxX = oX + textInputState.x * dw;
    const pxY = oY + textInputState.y * dh;
    return {
      left: `${(pxX / cw) * 100}%`,
      top: `${(pxY / ch) * 100}%`,
    };
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
            left: getTextInputPosition().left,
            top: getTextInputPosition().top,
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
  dashed = false,
  styleScale = 1
) {
  const lineLength = Math.sqrt((toX - fromX) ** 2 + (toY - fromY) ** 2);
  const headLength = Math.min(Math.max(lineLength * 0.2, 10 * styleScale), 20 * styleScale);
  const headWidth = headLength * 0.6;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  const lineEndX = toX - headLength * Math.cos(angle);
  const lineEndY = toY - headLength * Math.sin(angle);

  ctx.save();

  if (!dashed) {
    ctx.shadowColor = 'rgba(0, 0, 0, 0.15)';
    ctx.shadowBlur = 0;
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

  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(lineEndX, lineEndY);
  ctx.stroke();

  if (dashed) {
    ctx.setLineDash([]);
  }

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
