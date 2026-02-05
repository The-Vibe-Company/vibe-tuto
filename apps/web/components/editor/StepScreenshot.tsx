'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { QuickAnnotationBar } from './QuickAnnotationBar';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

interface StepScreenshotProps {
  src: string;
  alt: string;
  annotations: Annotation[];
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onUpdateAnnotation?: (id: string, updates: Partial<Annotation>) => void;
  onDeleteAnnotation?: (id: string) => void;
  readOnly?: boolean;
}

const ZOOM_LEVELS = [1, 1.5, 2];

export function StepScreenshot({
  src,
  alt,
  annotations,
  onAnnotationsChange,
  onUpdateAnnotation,
  onDeleteAnnotation,
  readOnly = false,
}: StepScreenshotProps) {
  const [zoomIndex, setZoomIndex] = useState(0);
  const [isAnnotating, setIsAnnotating] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const zoom = ZOOM_LEVELS[zoomIndex];

  const handleZoomIn = useCallback(() => {
    setZoomIndex((i) => Math.min(i + 1, ZOOM_LEVELS.length - 1));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoomIndex((i) => Math.max(i - 1, 0));
  }, []);

  const handleAddAnnotation = useCallback(
    (annotation: Annotation) => {
      if (readOnly) return;
      onAnnotationsChange?.([...annotations, annotation]);
    },
    [annotations, onAnnotationsChange, readOnly]
  );

  const handleClearAnnotations = useCallback(() => {
    if (readOnly) return;
    if (confirm('Delete all annotations?')) {
      onAnnotationsChange?.([]);
    }
  }, [onAnnotationsChange, readOnly]);

  const handleDone = useCallback(() => {
    setIsAnnotating(false);
    setActiveTool(null);
  }, []);

  const handleQuickToolSelect = useCallback((tool: AnnotationType) => {
    if (readOnly) return;
    setIsAnnotating(true);
    setActiveTool(tool);
  }, [readOnly]);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Annotation toolbar (shown when annotating, hidden in readOnly) */}
      {!readOnly && isAnnotating && (
        <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <AnnotationToolbar
            activeTool={activeTool}
            onToolChange={setActiveTool}
            onClearAll={handleClearAnnotations}
            onDone={handleDone}
            hasAnnotations={annotations.length > 0}
          />
        </div>
      )}

      {/* Screenshot container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border bg-muted transition-all duration-200',
          isAnnotating
            ? 'border-primary ring-2 ring-primary/20'
            : 'border-border'
        )}
      >
        {/* Scrollable zoom container */}
        <div
          className="overflow-auto"
          style={{ maxHeight: zoom > 1 ? '500px' : 'none' }}
        >
          <div
            ref={containerRef}
            className="relative transition-transform duration-200"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: zoom > 1 ? `${100 / zoom}%` : '100%',
            }}
          >
            {/* Image */}
            <div className="relative aspect-video w-full">
              <Image
                src={src}
                alt={alt}
                fill
                className="object-contain"
                sizes="(max-width: 768px) 100vw, 800px"
                loading="lazy"
                decoding="async"
              />

              {/* Annotation canvas (always visible, editable when annotating) */}
              <AnnotationCanvas
                annotations={annotations}
                activeTool={isAnnotating ? activeTool : null}
                onAddAnnotation={handleAddAnnotation}
                onUpdateAnnotation={onUpdateAnnotation}
                onDeleteAnnotation={onDeleteAnnotation}
                containerRef={containerRef}
                readOnly={readOnly}
              />
            </div>
          </div>
        </div>

        {/* Quick annotation bar (bottom-left, shown on hover, hidden in readOnly) */}
        {!readOnly && isHovering && !isAnnotating && (
          <div className="absolute bottom-3 left-3 z-10 animate-in fade-in slide-in-from-left-2 duration-150">
            <QuickAnnotationBar onToolSelect={handleQuickToolSelect} />
          </div>
        )}

        {/* Controls overlay (bottom-right) */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
          {/* Annotation count badge */}
          {annotations.length > 0 && !isAnnotating && (
            <Badge
              variant="secondary"
              className="h-7 gap-1 bg-background/90 backdrop-blur-sm"
            >
              <span className="text-xs tabular-nums">{annotations.length}</span>
              <span className="text-xs text-muted-foreground">annotations</span>
            </Badge>
          )}

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-border bg-background/90 p-1 shadow-sm backdrop-blur-sm">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomOut}
                  disabled={zoomIndex === 0}
                  className="h-7 w-7"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Zoom out
              </TooltipContent>
            </Tooltip>

            <span className="min-w-[3rem] text-center text-xs font-medium tabular-nums text-muted-foreground">
              {zoom}x
            </span>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleZoomIn}
                  disabled={zoomIndex === ZOOM_LEVELS.length - 1}
                  className="h-7 w-7"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Zoom in
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );
}
