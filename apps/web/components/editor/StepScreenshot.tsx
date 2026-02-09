'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar, type AnnotationStyle } from './AnnotationToolbar';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { DEFAULT_ANNOTATION_STYLE } from '@/lib/constants/annotation-styles';

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
  const [annotationStyle, setAnnotationStyle] = useState<AnnotationStyle>({
    color: DEFAULT_ANNOTATION_STYLE.color,
    strokeWidth: DEFAULT_ANNOTATION_STYLE.strokeWidth,
    fontSize: DEFAULT_ANNOTATION_STYLE.fontSize,
    opacity: DEFAULT_ANNOTATION_STYLE.opacity,
    textBackground: DEFAULT_ANNOTATION_STYLE.textBackground,
  });
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

  const handleToolChange = useCallback((tool: AnnotationType | null) => {
    setActiveTool(tool);
    if (tool) {
      setIsAnnotating(true);
    }
  }, []);

  const showToolbar = !readOnly && (isAnnotating || isHovering);

  return (
    <div
      className="relative"
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Screenshot container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border shadow-sm transition-all duration-200',
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

              <AnnotationCanvas
                annotations={annotations}
                activeTool={isAnnotating ? activeTool : null}
                onAddAnnotation={handleAddAnnotation}
                onUpdateAnnotation={onUpdateAnnotation}
                onDeleteAnnotation={onDeleteAnnotation}
                containerRef={containerRef}
                readOnly={readOnly}
                annotationStyle={annotationStyle}
              />
            </div>
          </div>
        </div>

        {/* Controls overlay (hidden in readOnly) */}
        {!readOnly && (
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">
            {/* Annotation count badge */}
            {annotations.length > 0 && !isAnnotating && (
              <Badge
                variant="secondary"
                className="h-6 gap-1 bg-background/90 backdrop-blur-sm text-xs shadow-sm"
              >
                <span className="tabular-nums">{annotations.length}</span>
                <span className="text-muted-foreground">annotations</span>
              </Badge>
            )}

            {/* Zoom controls - button group */}
            <div className="flex items-center rounded-lg border border-border bg-background/90 shadow-sm backdrop-blur-sm overflow-hidden">
              {ZOOM_LEVELS.map((level, i) => (
                <button
                  key={level}
                  onClick={() => setZoomIndex(i)}
                  className={cn(
                    'px-2.5 py-1 text-xs font-medium transition-colors',
                    i === zoomIndex
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {level}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Annotation toolbar - below the screenshot */}
      <div className={cn('flex justify-center', showToolbar ? 'mt-2' : 'h-0')}>
        {showToolbar && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <AnnotationToolbar
              activeTool={activeTool}
              onToolChange={handleToolChange}
              onClearAll={handleClearAnnotations}
              onDone={handleDone}
              hasAnnotations={annotations.length > 0}
              annotationStyle={annotationStyle}
              onStyleChange={setAnnotationStyle}
            />
          </div>
        )}
      </div>
    </div>
  );
}
