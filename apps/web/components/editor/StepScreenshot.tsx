'use client';

import { useState, useRef, useCallback } from 'react';
import Image from 'next/image';
import { ZoomIn, ZoomOut } from 'lucide-react';
import { AnnotationCanvas } from './AnnotationCanvas';
import { AnnotationToolbar } from './AnnotationToolbar';
import { QuickAnnotationBar } from './QuickAnnotationBar';
import type { Annotation, AnnotationType } from '@/lib/types/editor';
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
    if (confirm('Supprimer toutes les annotations ?')) {
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
        <div className="absolute -top-14 left-1/2 z-20 -translate-x-1/2">
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
          'relative overflow-hidden rounded-lg border bg-slate-100 transition-all',
          isAnnotating ? 'border-violet-400 ring-2 ring-violet-200' : 'border-slate-200'
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
                priority
              />

              {/* Annotation canvas (always visible, editable when annotating) */}
              <AnnotationCanvas
                annotations={annotations}
                activeTool={isAnnotating ? activeTool : null}
                onAddAnnotation={handleAddAnnotation}
                onUpdateAnnotation={onUpdateAnnotation}
                onDeleteAnnotation={onDeleteAnnotation}
                containerRef={containerRef}
              />
            </div>
          </div>
        </div>

        {/* Quick annotation bar (bottom-left, shown on hover, hidden in readOnly) */}
        {!readOnly && isHovering && !isAnnotating && (
          <div className="absolute bottom-3 left-3 z-10 animate-in fade-in duration-150">
            <QuickAnnotationBar onToolSelect={handleQuickToolSelect} />
          </div>
        )}

        {/* Controls overlay (bottom-right) */}
        <div className="absolute bottom-3 right-3 z-10 flex items-center gap-2">

          {/* Zoom controls */}
          <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white/90 p-1 shadow-sm backdrop-blur-sm">
            <button
              type="button"
              onClick={handleZoomOut}
              disabled={zoomIndex === 0}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition-colors',
                zoomIndex === 0
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              title="Zoom out"
            >
              <ZoomOut className="h-4 w-4" />
            </button>

            <span className="min-w-[3rem] text-center text-xs font-medium text-slate-600">
              {zoom}x
            </span>

            <button
              type="button"
              onClick={handleZoomIn}
              disabled={zoomIndex === ZOOM_LEVELS.length - 1}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded transition-colors',
                zoomIndex === ZOOM_LEVELS.length - 1
                  ? 'cursor-not-allowed text-slate-300'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              )}
              title="Zoom in"
            >
              <ZoomIn className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
