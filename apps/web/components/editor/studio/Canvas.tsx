'use client';

import { useEffect, useRef, useState } from 'react';
import type { Annotation, AnnotationType, StepWithSignedUrl } from '@/lib/types/editor';
import { Icon, ICON } from './icons';
import { Artboard } from './Artboard';
import { actionDotColor, formatHostFromUrl, stepAction } from './helpers';

interface CanvasProps {
  step: StepWithSignedUrl | null;
  screenshots: StepWithSignedUrl[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onTitleChange: (stepId: string, title: string) => void;
  onCaptionChange: (stepId: string, caption: string) => void;
  onAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  selectedAnnotationId: string | null;
  onSelectAnnotation: (id: string | null) => void;
  activeTool: AnnotationType | null;
  onToolChange: (tool: AnnotationType | null) => void;
  onOpenFocus: () => void;
}

const ZOOM_LEVELS = [1, 1.5, 2];

interface ToolDef {
  d?: string;
  k?: string;
  tool?: AnnotationType | 'select' | 'hand' | 'pen';
  divider?: boolean;
}

const TOOLS: ToolDef[] = [
  { d: ICON.cursor, k: 'V', tool: 'select' },
  { d: ICON.hand, k: 'H', tool: 'hand' },
  { divider: true },
  { d: ICON.rect, k: 'R', tool: 'rectangle' },
  { d: 'M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18', k: 'C', tool: 'circle' },
  { d: ICON.arrowAnno, k: 'A', tool: 'arrow' },
  { d: ICON.text, k: 'T', tool: 'text' },
  { d: ICON.hl, k: 'L', tool: 'highlight' },
  { d: ICON.blur, k: 'B', tool: 'blur' },
  { d: ICON.number, k: 'N', tool: 'numbered-callout' },
  { d: ICON.pen, k: 'P', tool: 'pen' },
];

const ANNOTATION_TOOLS: AnnotationType[] = [
  'circle',
  'rectangle',
  'arrow',
  'text',
  'highlight',
  'blur',
  'numbered-callout',
];

export function Canvas({
  step,
  screenshots,
  onSelectStep,
  onTitleChange,
  onCaptionChange,
  onAnnotationsChange,
  selectedAnnotationId,
  onSelectAnnotation,
  activeTool,
  onToolChange,
  onOpenFocus,
}: CanvasProps) {
  const [zoomIdx, setZoomIdx] = useState(0);
  const titleRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  const stepIdx = step ? screenshots.findIndex((s) => s.id === step.id) : -1;
  const totalSteps = screenshots.length;

  // Hotkey support: V/H/R/A/T/L/B/N/P/F to switch tools / open focus.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)
      ) {
        return;
      }
      const key = e.key.toUpperCase();
      const def = TOOLS.find((t) => t.k === key);
      if (def && def.tool) {
        if (ANNOTATION_TOOLS.includes(def.tool as AnnotationType)) {
          e.preventDefault();
          onToolChange(def.tool as AnnotationType);
        } else {
          e.preventDefault();
          onToolChange(null);
        }
        return;
      }
      if (key === 'F') {
        e.preventDefault();
        onOpenFocus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onToolChange, onOpenFocus]);

  // Sync editable fields on step change
  const stepTitle = step?.text_content ?? '';
  const stepDescription = step?.description ?? '';
  useEffect(() => {
    if (titleRef.current) {
      if (titleRef.current.innerText !== stepTitle) {
        titleRef.current.innerText = stepTitle;
      }
    }
    if (captionRef.current) {
      if (captionRef.current.innerText !== stepDescription) {
        captionRef.current.innerText = stepDescription;
      }
    }
  }, [stepTitle, stepDescription]);

  if (!step) {
    return (
      <main className="studio-canvas-bg" style={{ flex: 1, position: 'relative' }}>
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ color: 'var(--studio-muted)', fontSize: 13 }}
        >
          <div
            style={{
              padding: '40px 56px',
              textAlign: 'center',
              background: 'var(--studio-surface)',
              border: '1px dashed var(--studio-line-strong)',
              borderRadius: 14,
              fontFamily: 'var(--studio-font-display)',
              fontSize: 18,
              color: 'var(--studio-ink-2)',
            }}
          >
            Select a step from the timeline to start editing.
          </div>
        </div>
      </main>
    );
  }

  const accent = 'var(--studio-accent)';
  const action = stepAction(step);
  const url = step.url || step.source?.url || null;
  const dotColor = actionDotColor(step);

  return (
    <main
      className="studio-canvas-bg"
      style={{ flex: 1, minWidth: 0, position: 'relative', overflow: 'hidden' }}
    >
      {/* Top floating bar: tools + zoom + step counter + Focus */}
      <div
        style={{
          position: 'absolute',
          top: 14,
          left: 14,
          right: 14,
          zIndex: 5,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        {/* tool palette */}
        <div
          className="ed-shadow-2"
          style={{
            display: 'flex',
            gap: 6,
            background: 'var(--studio-surface)',
            padding: 4,
            borderRadius: 10,
            border: '1px solid var(--studio-line)',
          }}
        >
          {TOOLS.map((t, i) => {
            if (t.divider) {
              return (
                <span
                  key={`d-${i}`}
                  style={{ width: 1, background: 'var(--studio-line)', margin: '2px 2px' }}
                />
              );
            }
            const isAnnoTool = ANNOTATION_TOOLS.includes(t.tool as AnnotationType);
            const active = isAnnoTool
              ? activeTool === (t.tool as AnnotationType)
              : !activeTool && t.tool === 'select';
            return (
              <button
                key={`t-${i}`}
                className="ed-btn-icon ed-btn-sm"
                title={`${t.tool} · ${t.k}`}
                onClick={() => {
                  if (isAnnoTool) {
                    onToolChange(
                      activeTool === t.tool ? null : (t.tool as AnnotationType)
                    );
                  } else {
                    onToolChange(null);
                  }
                }}
                style={{
                  border: 0,
                  position: 'relative',
                  background: active ? 'var(--studio-ink)' : 'transparent',
                  color: active ? '#fff' : 'var(--studio-ink-2)',
                }}
              >
                {t.d && <Icon d={t.d} size={13} />}
                {t.k && (
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 1,
                      right: 2,
                      fontSize: 8,
                      fontFamily: 'var(--studio-font-mono)',
                      color: active
                        ? 'rgba(255,255,255,.5)'
                        : 'var(--studio-muted-2)',
                    }}
                  >
                    {t.k}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* right-side controls */}
        <div className="flex items-center" style={{ gap: 6 }}>
          <div
            className="ed-shadow-1"
            style={{
              background: 'var(--studio-surface)',
              padding: '5px 10px',
              borderRadius: 8,
              border: '1px solid var(--studio-line)',
              fontSize: 11,
              color: 'var(--studio-ink-2)',
              fontFamily: 'var(--studio-font-mono)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span style={{ color: 'var(--studio-muted)' }}>STEP</span>
            <span style={{ fontWeight: 600 }}>
              {String(stepIdx + 1).padStart(2, '0')}
            </span>
            <span style={{ color: 'var(--studio-muted)' }}>
              / {String(totalSteps).padStart(2, '0')}
            </span>
          </div>
          <button
            onClick={onOpenFocus}
            className="ed-btn ed-btn-sm ed-shadow-1"
          >
            <Icon d={ICON.eye} size={12} /> Focus
          </button>
          <div
            className="ed-shadow-1"
            style={{
              background: 'var(--studio-surface)',
              padding: 4,
              borderRadius: 8,
              border: '1px solid var(--studio-line)',
              display: 'flex',
            }}
          >
            <button
              className="ed-btn-icon ed-btn-sm"
              style={{ border: 0 }}
              onClick={() => setZoomIdx((i) => Math.max(0, i - 1))}
              disabled={zoomIdx === 0}
            >
              <Icon d={ICON.zoomOut} size={13} />
            </button>
            <span
              style={{
                fontSize: 11,
                color: 'var(--studio-ink-2)',
                alignSelf: 'center',
                padding: '0 8px',
                fontFamily: 'var(--studio-font-mono)',
                fontWeight: 500,
                minWidth: 44,
                textAlign: 'center',
              }}
            >
              {Math.round(ZOOM_LEVELS[zoomIdx] * 100)}%
            </span>
            <button
              className="ed-btn-icon ed-btn-sm"
              style={{ border: 0 }}
              onClick={() =>
                setZoomIdx((i) => Math.min(ZOOM_LEVELS.length - 1, i + 1))
              }
              disabled={zoomIdx === ZOOM_LEVELS.length - 1}
            >
              <Icon d={ICON.zoomIn} size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* artboard area */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          padding: '78px 28px 110px',
          overflow: 'auto',
        }}
      >
        <div style={{ width: '100%', maxWidth: 760 }}>
          {/* Step header */}
          <div
            className="flex items-start"
            style={{ gap: 14, marginBottom: 18 }}
          >
            <span
              aria-hidden
              style={{
                flex: 'none',
                width: 36,
                height: 36,
                borderRadius: 10,
                background: accent,
                color: '#fff',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 15,
                fontWeight: 600,
                fontFamily: 'var(--studio-font-mono)',
                boxShadow: `0 6px 14px -4px color-mix(in oklab, ${accent} 50%, transparent)`,
              }}
            >
              {stepIdx >= 0 ? stepIdx + 1 : '·'}
            </span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                ref={titleRef}
                contentEditable
                suppressContentEditableWarning
                onBlur={(e) =>
                  onTitleChange(step.id, (e.target as HTMLDivElement).innerText.trim())
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    (e.target as HTMLDivElement).blur();
                  }
                }}
                style={{
                  fontSize: 26,
                  fontFamily: 'var(--studio-font-display)',
                  fontWeight: 400,
                  letterSpacing: -0.01,
                  lineHeight: 1.1,
                  color: 'var(--studio-ink)',
                  minHeight: 28,
                }}
                data-placeholder="Untitled step"
              />
              <div
                className="flex items-center"
                style={{
                  fontSize: 12,
                  color: 'var(--studio-muted)',
                  marginTop: 8,
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <span
                  className={
                    action === 'click'
                      ? 'ed-chip click'
                      : action === 'type'
                        ? 'ed-chip'
                        : 'ed-chip'
                  }
                  style={{
                    color: action === 'click' ? '#b94627' : undefined,
                    background:
                      action === 'click' ? 'var(--studio-click-soft)' : undefined,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: dotColor,
                    }}
                  />
                  <span style={{ textTransform: 'uppercase', letterSpacing: 0.04, fontWeight: 600 }}>
                    {action}
                  </span>
                </span>
                {url && (
                  <span className="ed-chip">
                    <Icon
                      d={ICON.globe}
                      size={10}
                      stroke="var(--studio-muted)"
                    />
                    <span
                      style={{
                        fontFamily: 'var(--studio-font-mono)',
                        fontSize: 10,
                        maxWidth: 280,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {formatHostFromUrl(url)}
                    </span>
                  </span>
                )}
                <span className="ed-chip">
                  <Icon
                    d={ICON.layers}
                    size={10}
                    stroke="var(--studio-muted)"
                  />
                  {(step.annotations || []).length} anno
                </span>
              </div>
            </div>
          </div>

          {/* Artboard */}
          <Artboard
            step={step}
            annotations={step.annotations || []}
            onAnnotationsChange={(next) => onAnnotationsChange(step.id, next)}
            selectedAnnotationId={selectedAnnotationId}
            onSelectionChange={onSelectAnnotation}
            activeTool={activeTool}
            zoom={ZOOM_LEVELS[zoomIdx]}
            showFrame
          />

          {/* Caption */}
          <div
            className="ed-shadow-1"
            style={{
              marginTop: 22,
              padding: '16px 18px',
              background: 'var(--studio-surface)',
              borderRadius: 12,
              border: '1px solid var(--studio-line)',
              display: 'flex',
              gap: 14,
              alignItems: 'flex-start',
            }}
          >
            <span
              aria-hidden
              style={{
                flex: 'none',
                width: 24,
                height: 24,
                borderRadius: 6,
                background: 'var(--studio-surface-2)',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Icon d={ICON.text} size={13} stroke="var(--studio-muted)" />
            </span>
            <div
              ref={captionRef}
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) =>
                onCaptionChange(step.id, (e.target as HTMLDivElement).innerText)
              }
              style={{
                flex: 1,
                fontSize: 14.5,
                lineHeight: 1.6,
                color: 'var(--studio-ink-2)',
                minHeight: 22,
                outline: 'none',
              }}
              data-placeholder="Add a caption…"
            />
          </div>
        </div>
      </div>

      {/* Bottom playhead */}
      {screenshots.length > 0 && (
        <div
          className="ed-shadow-2"
          style={{
            position: 'absolute',
            bottom: 14,
            left: 14,
            right: 14,
            zIndex: 5,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: 8,
            background: 'var(--studio-surface)',
            borderRadius: 12,
            border: '1px solid var(--studio-line)',
          }}
        >
          <button
            className="ed-btn-icon ed-btn-sm"
            disabled={stepIdx <= 0}
            onClick={() =>
              stepIdx > 0 && onSelectStep(screenshots[stepIdx - 1].id)
            }
            aria-label="Previous step"
          >
            <Icon d={ICON.chevronL} size={14} />
          </button>
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              gap: 3,
              overflowX: 'auto',
            }}
          >
            {screenshots.map((s, i) => {
              const active = s.id === step.id;
              const dot = actionDotColor(s);
              return (
                <button
                  key={s.id}
                  onClick={() => onSelectStep(s.id)}
                  title={s.text_content || `Step ${i + 1}`}
                  style={{
                    flex: 1,
                    minWidth: 28,
                    height: 32,
                    borderRadius: 6,
                    background: active ? accent : 'var(--studio-surface-2)',
                    border: active
                      ? `1px solid ${accent}`
                      : '1px solid var(--studio-line)',
                    color: active ? '#fff' : 'var(--studio-ink-2)',
                    fontSize: 11,
                    fontWeight: 600,
                    fontFamily: 'var(--studio-font-mono)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                  }}
                >
                  <span
                    style={{
                      width: 6,
                      height: 6,
                      borderRadius: 999,
                      background: active ? '#fff' : dot,
                    }}
                  />
                  {String(i + 1).padStart(2, '0')}
                </button>
              );
            })}
          </div>
          <span
            style={{
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 11,
              color: 'var(--studio-muted)',
              padding: '0 6px',
              flex: 'none',
            }}
          >
            {String(stepIdx + 1).padStart(2, '0')} /{' '}
            {String(totalSteps).padStart(2, '0')}
          </span>
          <button
            className="ed-btn-icon ed-btn-sm"
            disabled={stepIdx >= totalSteps - 1}
            onClick={() =>
              stepIdx < totalSteps - 1 &&
              onSelectStep(screenshots[stepIdx + 1].id)
            }
            aria-label="Next step"
          >
            <Icon d={ICON.chevronR} size={14} />
          </button>
        </div>
      )}
    </main>
  );
}
