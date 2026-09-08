'use client';

import { useRef, useState, useEffect } from 'react';
import Image from 'next/image';
import { AnnotationCanvas } from '../AnnotationCanvas';
import type { Annotation } from '@/lib/types/editor';
import type { StepWithSignedUrl } from '@/lib/types/editor';

interface ArtboardProps {
  step: StepWithSignedUrl;
  annotations: Annotation[];
  onAnnotationsChange: (annotations: Annotation[]) => void;
  selectedAnnotationId: string | null;
  onSelectionChange: (id: string | null) => void;
  activeTool: Annotation['type'] | null;
  /** Show dashed selection bbox & ruler chips (editor mode). */
  showFrame?: boolean;
  /** Image zoom factor (1, 1.5, 2). */
  zoom?: number;
  readOnly?: boolean;
}

/** Stripe-screenshot stand-in used when a step has no `signedScreenshotUrl`.
   Mirrors the visual feel of the prototype's `<Shot>` so the canvas never feels empty. */
function PlaceholderShot({ label }: { label: string }) {
  return (
    <div
      className="absolute inset-0"
      style={{
        background: 'linear-gradient(180deg, #fafaf6 0%, #f3efe6 100%)',
      }}
    >
      <div
        style={{
          height: 36,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '0 14px',
          background: '#f6f3ec',
          borderBottom: '1px solid #ece7db',
        }}
      >
        <span style={{ display: 'flex', gap: 6 }}>
          <i style={{ width: 9, height: 9, borderRadius: 999, background: '#e2b1a4' }} />
          <i style={{ width: 9, height: 9, borderRadius: 999, background: '#e6cba0' }} />
          <i style={{ width: 9, height: 9, borderRadius: 999, background: '#b9d4ad' }} />
        </span>
        <span
          style={{
            flex: 1,
            height: 22,
            borderRadius: 6,
            background: '#fff',
            border: '1px solid #e6e0d2',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontFamily: 'var(--studio-font-mono)',
            fontSize: 11,
            color: '#9a8e76',
          }}
        >
          {label}
        </span>
      </div>
      <div
        className="flex items-center justify-center"
        style={{
          position: 'absolute',
          inset: '36px 0 0 0',
          color: 'var(--studio-muted-2)',
          fontSize: 13,
          fontFamily: 'var(--studio-font-display)',
        }}
      >
        No screenshot for this step
      </div>
    </div>
  );
}

export function Artboard({
  step,
  annotations,
  onAnnotationsChange,
  selectedAnnotationId,
  onSelectionChange,
  activeTool,
  showFrame = true,
  zoom = 1,
  readOnly = false,
}: ArtboardProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [naturalWidth, setNaturalWidth] = useState<number | null>(null);
  const [renderedHeight, setRenderedHeight] = useState<number | null>(null);

  const src = step.signedScreenshotUrl;
  const accent = 'var(--studio-accent)';

  useEffect(() => {
    if (!wrapperRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) setRenderedHeight(entry.contentRect.height);
    });
    ro.observe(wrapperRef.current);
    return () => ro.disconnect();
  }, []);

  const handleAdd = (a: Annotation) => onAnnotationsChange([...annotations, a]);
  const handleUpdate = (id: string, updates: Partial<Annotation>) =>
    onAnnotationsChange(
      annotations.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  const handleDelete = (id: string) => {
    onAnnotationsChange(annotations.filter((a) => a.id !== id));
    onSelectionChange(null);
  };

  return (
    <div className="relative" ref={wrapperRef}>
      <div
        className="relative overflow-hidden"
        style={{
          borderRadius: 12,
          border: '1px solid #e3ddd0',
          background: '#fff',
          boxShadow: '0 1px 0 rgba(20,16,8,.04), 0 12px 30px -16px rgba(20,16,8,.12)',
        }}
      >
        <div
          className="overflow-auto"
          style={{ maxHeight: zoom > 1 ? 600 : 'none' }}
        >
          <div
            ref={containerRef}
            className="relative"
            style={{
              transform: `scale(${zoom})`,
              transformOrigin: 'top left',
              width: zoom > 1 ? `${100 / zoom}%` : '100%',
              transition: 'transform .2s ease',
            }}
          >
            <div className="relative aspect-video w-full">
              {src ? (
                <Image
                  src={src}
                  alt={step.text_content || 'Step screenshot'}
                  fill
                  className="object-contain"
                  sizes="(max-width: 768px) 100vw, 800px"
                  loading="lazy"
                  decoding="async"
                  onLoadingComplete={(img) => setNaturalWidth(img.naturalWidth)}
                />
              ) : (
                <PlaceholderShot
                  label={step.url || step.source?.url || 'about:blank'}
                />
              )}

              <AnnotationCanvas
                annotations={annotations}
                activeTool={activeTool}
                onAddAnnotation={handleAdd}
                onUpdateAnnotation={handleUpdate}
                onDeleteAnnotation={handleDelete}
                containerRef={containerRef}
                readOnly={readOnly}
                selectedAnnotationId={selectedAnnotationId}
                onSelectionChange={onSelectionChange}
              />
            </div>
          </div>
        </div>
      </div>

      {/* dashed selection bbox + ruler chips (editor frame) */}
      {showFrame && (
        <>
          <div
            aria-hidden
            style={{
              position: 'absolute',
              inset: -6,
              border: `1px dashed ${accent}`,
              borderRadius: 14,
              pointerEvents: 'none',
            }}
          />
          {[
            [0, 0],
            [0.5, 0],
            [1, 0],
            [1, 0.5],
            [1, 1],
            [0.5, 1],
            [0, 1],
            [0, 0.5],
          ].map(([x, y], i) => (
            <span
              key={i}
              aria-hidden
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                background: '#fff',
                border: `1.5px solid ${accent}`,
                borderRadius: 2,
                left: `calc(${x * 100}% - 4px)`,
                top: `calc(${y * 100}% - 4px)`,
                pointerEvents: 'none',
              }}
            />
          ))}
          <span
            aria-hidden
            style={{
              position: 'absolute',
              top: -22,
              left: '50%',
              transform: 'translateX(-50%)',
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 10,
              color: accent,
              fontWeight: 600,
              background: 'var(--studio-surface)',
              padding: '1px 6px',
              borderRadius: 3,
              border: `1px solid color-mix(in oklab, ${accent} 25%, transparent)`,
              whiteSpace: 'nowrap',
            }}
          >
            {naturalWidth ? `${naturalWidth} px` : 'auto'}
          </span>
          <span
            aria-hidden
            style={{
              position: 'absolute',
              left: -34,
              top: '50%',
              transform: 'translateY(-50%) rotate(-90deg)',
              transformOrigin: 'right center',
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 10,
              color: accent,
              fontWeight: 600,
              background: 'var(--studio-surface)',
              padding: '1px 6px',
              borderRadius: 3,
              border: `1px solid color-mix(in oklab, ${accent} 25%, transparent)`,
              whiteSpace: 'nowrap',
            }}
          >
            {renderedHeight ? `${Math.round(renderedHeight)} px` : 'auto'}
          </span>
        </>
      )}
    </div>
  );
}
