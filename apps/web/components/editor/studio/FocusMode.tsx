'use client';

import { useEffect } from 'react';
import type { Annotation, StepWithSignedUrl } from '@/lib/types/editor';
import { Icon, ICON } from './icons';
import { Artboard } from './Artboard';

interface FocusModeProps {
  step: StepWithSignedUrl;
  stepIdx: number;
  screenshots: StepWithSignedUrl[];
  onAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onPrev: () => void;
  onNext: () => void;
  onClose: () => void;
}

export function FocusMode({
  step,
  stepIdx,
  screenshots,
  onAnnotationsChange,
  onPrev,
  onNext,
  onClose,
}: FocusModeProps) {
  const accent = 'var(--studio-accent)';
  const isFirst = stepIdx <= 0;
  const isLast = stepIdx >= screenshots.length - 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowLeft' && !isFirst) onPrev();
      else if (e.key === 'ArrowRight' && !isLast) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, onPrev, onNext, isFirst, isLast]);

  return (
    <div
      className="studio-focus-anim"
      style={{
        position: 'absolute',
        inset: 0,
        zIndex: 50,
        background: 'rgba(20,16,8,.85)',
        backdropFilter: 'blur(20px)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <header
        style={{
          flex: 'none',
          height: 54,
          padding: '0 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          color: '#f1ece1',
        }}
      >
        <div className="flex items-center" style={{ gap: 14, minWidth: 0 }}>
          <span
            style={{
              fontSize: 11,
              fontFamily: 'var(--studio-font-mono)',
              color: '#9a8e76',
              textTransform: 'uppercase',
              letterSpacing: 0.06,
            }}
          >
            Focus mode · Step
          </span>
          <span
            style={{
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            {String(stepIdx + 1).padStart(2, '0')} /{' '}
            {String(screenshots.length).padStart(2, '0')}
          </span>
          <span
            style={{ width: 1, height: 18, background: 'rgba(255,255,255,.15)' }}
          />
          <span
            style={{
              fontFamily: 'var(--studio-font-display)',
              fontSize: 18,
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxWidth: 480,
            }}
          >
            {step.text_content || 'Untitled step'}
          </span>
        </div>
        <button
          onClick={onClose}
          className="ed-btn-icon ed-btn-sm"
          style={{
            background: 'rgba(255,255,255,.06)',
            color: '#f1ece1',
            border: '1px solid rgba(255,255,255,.1)',
          }}
          aria-label="Exit focus mode"
        >
          <Icon d={ICON.logout} size={13} />
        </button>
      </header>

      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 80px',
        }}
      >
        <button
          onClick={onPrev}
          disabled={isFirst}
          aria-label="Previous step"
          style={{
            position: 'absolute',
            left: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            borderRadius: 999,
            background: 'rgba(255,255,255,.06)',
            color: '#f1ece1',
            border: '1px solid rgba(255,255,255,.1)',
            cursor: isFirst ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isFirst ? 0.3 : 1,
          }}
        >
          <Icon d={ICON.chevronL} size={18} />
        </button>

        <div
          className="flex items-start"
          style={{
            width: '100%',
            maxWidth: 1080,
            gap: 28,
          }}
        >
          <div
            aria-hidden
            style={{
              flex: 'none',
              width: 56,
              height: 56,
              borderRadius: 14,
              background: accent,
              color: '#fff',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 22,
              fontWeight: 600,
              fontFamily: 'var(--studio-font-mono)',
              boxShadow: `0 12px 30px -6px color-mix(in oklab, ${accent} 60%, transparent)`,
            }}
          >
            {stepIdx + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                fontSize: 32,
                fontFamily: 'var(--studio-font-display)',
                fontWeight: 400,
                color: '#f1ece1',
                letterSpacing: -0.01,
                lineHeight: 1.1,
                marginBottom: 8,
              }}
            >
              {step.text_content || 'Untitled step'}
            </div>
            {step.description && (
              <div
                style={{
                  fontSize: 15,
                  color: '#bdb5a3',
                  lineHeight: 1.6,
                  marginBottom: 20,
                  whiteSpace: 'pre-wrap',
                }}
              >
                {step.description}
              </div>
            )}
            <Artboard
              step={step}
              annotations={step.annotations || []}
              onAnnotationsChange={(next) => onAnnotationsChange(step.id, next)}
              selectedAnnotationId={null}
              onSelectionChange={() => {}}
              activeTool={null}
              showFrame={false}
              readOnly
            />
          </div>
        </div>

        <button
          onClick={onNext}
          disabled={isLast}
          aria-label="Next step"
          style={{
            position: 'absolute',
            right: 24,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 44,
            height: 44,
            borderRadius: 999,
            background: 'rgba(255,255,255,.06)',
            color: '#f1ece1',
            border: '1px solid rgba(255,255,255,.1)',
            cursor: isLast ? 'not-allowed' : 'pointer',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: isLast ? 0.3 : 1,
          }}
        >
          <Icon d={ICON.chevronR} size={18} />
        </button>
      </div>

      <div
        className="flex justify-center"
        style={{ flex: 'none', padding: '12px 24px', gap: 6 }}
      >
        {screenshots.map((s, i) => (
          <span
            key={s.id}
            aria-hidden
            style={{
              width: 36,
              height: 4,
              borderRadius: 999,
              background: i === stepIdx ? accent : 'rgba(255,255,255,.15)',
            }}
          />
        ))}
      </div>
    </div>
  );
}
