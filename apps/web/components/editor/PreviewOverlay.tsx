'use client';

import { useEffect, useRef, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StepWithSignedUrl, Annotation } from '@/lib/types/editor';

interface PreviewOverlayProps {
  steps: StepWithSignedUrl[];
  currentStepIndex: number;
  onStepChange: (index: number) => void;
  onClose: () => void;
}

const ANNOTATION_COLOR = '#e63946';
const HIGHLIGHT_COLOR = 'rgba(244, 211, 94, 0.4)';

export function PreviewOverlay({
  steps,
  currentStepIndex,
  onStepChange,
  onClose,
}: PreviewOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const currentStep = steps[currentStepIndex];
  const totalSteps = steps.length;
  const hasPrevious = currentStepIndex > 0;
  const hasNext = currentStepIndex < totalSteps - 1;

  const goToPrevious = useCallback(() => {
    if (hasPrevious) {
      onStepChange(currentStepIndex - 1);
    }
  }, [hasPrevious, currentStepIndex, onStepChange]);

  const goToNext = useCallback(() => {
    if (hasNext) {
      onStepChange(currentStepIndex + 1);
    }
  }, [hasNext, currentStepIndex, onStepChange]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
        case 'k':
          goToPrevious();
          break;
        case 'ArrowRight':
        case 'j':
          goToNext();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, goToPrevious, goToNext]);

  // Draw annotations on canvas
  const drawAnnotations = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !container || !ctx) return;

    const rect = container.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const annotations = (currentStep?.annotations as Annotation[] | undefined) ?? [];
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
          ctx.filter = `blur(10px)`;
          ctx.fillRect(x, y, w, h);
          ctx.filter = 'none';
          break;
        }
        case 'click-indicator': {
          // Draw cursor icon similar to MousePointer2
          const size = 28;
          ctx.save();
          ctx.translate(x - 4, y - 4);
          ctx.scale(size / 24, size / 24);

          ctx.fillStyle = ann.color || '#8b5cf6';
          ctx.strokeStyle = 'white';
          ctx.lineWidth = 1.5 / (size / 24);

          // MousePointer2 SVG path
          const cursorPath = new Path2D('M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z');
          ctx.fill(cursorPath);
          ctx.stroke(cursorPath);

          ctx.restore();
          break;
        }
      }
    });
  }, [currentStep?.annotations]);

  // Redraw on step change and resize
  useEffect(() => {
    drawAnnotations();

    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver(() => {
      drawAnnotations();
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, [drawAnnotations]);

  if (!currentStep) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/95">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-white/10 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-white hover:bg-white/10"
          >
            <X className="h-5 w-5" />
          </Button>
          <span className="text-sm font-medium text-white/80">Aperçu du tutoriel</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-white/60">
          <span className="font-medium text-white">{currentStepIndex + 1}</span>
          <span>/</span>
          <span>{totalSteps}</span>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center gap-6 overflow-auto p-8">
        {/* Screenshot with annotations */}
        {currentStep.signedScreenshotUrl ? (
          <div
            ref={containerRef}
            className="relative max-h-[60vh] max-w-4xl overflow-hidden rounded-lg shadow-2xl"
          >
            <img
              src={currentStep.signedScreenshotUrl}
              alt={`Étape ${currentStepIndex + 1}`}
              className="h-auto max-h-[60vh] w-auto max-w-full"
              onLoad={drawAnnotations}
            />
            <canvas
              ref={canvasRef}
              className="pointer-events-none absolute inset-0"
            />
          </div>
        ) : (
          <div className="flex h-64 w-full max-w-4xl items-center justify-center rounded-lg border border-white/20 bg-white/5">
            <p className="text-white/40">Aucune capture d'écran</p>
          </div>
        )}

        {/* Text content */}
        <div className="w-full max-w-2xl rounded-lg bg-white/5 p-6">
          {currentStep.text_content ? (
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: currentStep.text_content }}
            />
          ) : (
            <p className="text-center text-white/40 italic">
              Aucune description pour cette étape
            </p>
          )}
        </div>
      </div>

      {/* Navigation footer */}
      <footer className="flex items-center justify-center gap-4 border-t border-white/10 p-4">
        <Button
          variant="outline"
          onClick={goToPrevious}
          disabled={!hasPrevious}
          className="border-white/20 bg-transparent text-white hover:bg-white/10 disabled:opacity-30"
        >
          <ChevronLeft className="mr-2 h-4 w-4" />
          Précédent
        </Button>
        <Button
          variant="outline"
          onClick={goToNext}
          disabled={!hasNext}
          className="border-white/20 bg-transparent text-white hover:bg-white/10 disabled:opacity-30"
        >
          Suivant
          <ChevronRight className="ml-2 h-4 w-4" />
        </Button>
      </footer>

      {/* Keyboard shortcuts hint */}
      <div className="absolute bottom-4 left-4 text-xs text-white/30">
        <kbd className="rounded bg-white/10 px-1.5 py-0.5">Esc</kbd> fermer
        <span className="mx-2">|</span>
        <kbd className="rounded bg-white/10 px-1.5 py-0.5">←</kbd>
        <kbd className="ml-1 rounded bg-white/10 px-1.5 py-0.5">→</kbd> naviguer
      </div>
    </div>
  );
}

// Helper to draw an arrow
function drawArrow(
  ctx: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color: string
) {
  const headLength = 15;
  const angle = Math.atan2(toY - fromY, toX - fromX);

  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 3;

  // Line
  ctx.beginPath();
  ctx.moveTo(fromX, fromY);
  ctx.lineTo(toX, toY);
  ctx.stroke();

  // Arrowhead
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
