'use client';

import { useState, useEffect } from 'react';
import type { Annotation, StepWithSignedUrl } from '@/lib/types/editor';
import { Icon, ICON } from './icons';
import { stepAction } from './helpers';

type InspectorTab = 'selection' | 'step' | 'history';

interface InspectorProps {
  step: StepWithSignedUrl | null;
  stepIdx: number;
  selectedAnnotationId: string | null;
  onAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onUrlChange: (stepId: string, url: string) => void;
  onShowUrlChange: (stepId: string, showUrl: boolean) => void;
  onTitleChange: (stepId: string, title: string) => void;
  onDeleteStep: (stepId: string) => void;
}

export function Inspector(props: InspectorProps) {
  const [tab, setTab] = useState<InspectorTab>('selection');

  // When the user picks an annotation, jump to the Selection tab.
  useEffect(() => {
    if (props.selectedAnnotationId) setTab('selection');
  }, [props.selectedAnnotationId]);

  const accent = 'var(--studio-accent)';

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 296,
        flex: 'none',
        background: 'var(--studio-surface)',
        borderLeft: '1px solid var(--studio-line)',
        overflow: 'hidden',
      }}
    >
      <div
        className="flex"
        style={{ borderBottom: '1px solid var(--studio-line)' }}
      >
        {(
          [
            ['selection', 'Selection', ICON.cursor],
            ['step', 'Step', ICON.image],
            ['history', 'History', ICON.history],
          ] as const
        ).map(([k, l, ic]) => {
          const active = tab === k;
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                flex: 1,
                padding: '12px 0',
                fontSize: 11.5,
                fontWeight: 600,
                border: 0,
                background: 'transparent',
                color: active ? 'var(--studio-ink)' : 'var(--studio-muted)',
                borderBottom: active
                  ? `2px solid ${accent}`
                  : '2px solid transparent',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                fontFamily: 'inherit',
              }}
            >
              <Icon
                d={ic}
                size={12}
                stroke={active ? 'var(--studio-ink)' : 'var(--studio-muted)'}
              />
              {l}
            </button>
          );
        })}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14 }}>
        {!props.step ? (
          <EmptyHint>Select a step from the timeline.</EmptyHint>
        ) : tab === 'selection' ? (
          <InspectorSelection {...props} step={props.step} />
        ) : tab === 'step' ? (
          <InspectorStep {...props} step={props.step} />
        ) : (
          <InspectorHistory />
        )}
      </div>
    </aside>
  );
}

/* ---------- Selection tab ---------- */

const SWATCHES = [
  '#16140f',
  '#ef5a3a',
  '#4f46e5',
  '#2f7a4d',
  '#c08a2a',
  '#0ea5e9',
  '#a855f7',
];

function InspectorSelection({
  step,
  selectedAnnotationId,
  onAnnotationsChange,
}: InspectorProps & { step: StepWithSignedUrl }) {
  const annos = step.annotations || [];
  const anno = annos.find((a) => a.id === selectedAnnotationId) || null;

  if (!anno) {
    return (
      <EmptyHint>
        Select an annotation on the canvas to edit it. Pick a tool from the
        floating toolbar to draw a new one.
      </EmptyHint>
    );
  }

  const annoIdx = annos.indexOf(anno) + 1;
  const accent = 'var(--studio-accent)';
  const kindLabel: Record<Annotation['type'], string> = {
    circle: 'Circle',
    rectangle: 'Rectangle',
    arrow: 'Arrow',
    text: 'Text',
    blur: 'Blur strip',
    highlight: 'Highlight',
    'click-indicator': 'Click target',
    'numbered-callout': 'Number badge',
  };
  const kindIcon: Record<Annotation['type'], string> = {
    circle: ICON.rect,
    rectangle: ICON.rect,
    arrow: ICON.arrowAnno,
    text: ICON.text,
    blur: ICON.blur,
    highlight: ICON.hl,
    'click-indicator': ICON.cursor,
    'numbered-callout': ICON.number,
  };

  const updateSelected = (patch: Partial<Annotation>) =>
    onAnnotationsChange(
      step.id,
      annos.map((a) => (a.id === anno.id ? { ...a, ...patch } : a))
    );
  const removeSelected = () =>
    onAnnotationsChange(
      step.id,
      annos.filter((a) => a.id !== anno.id)
    );

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      {/* header */}
      <div
        className="flex items-center"
        style={{
          gap: 10,
          padding: 10,
          background: 'var(--studio-surface-2)',
          borderRadius: 10,
          border: '1px solid var(--studio-line)',
        }}
      >
        <span
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `color-mix(in oklab, ${accent} 14%, white)`,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: accent,
            border: `1px solid color-mix(in oklab, ${accent} 25%, transparent)`,
          }}
        >
          <Icon d={kindIcon[anno.type]} size={15} stroke={accent} />
        </span>
        <div style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600 }}>
            {kindLabel[anno.type]}
          </div>
          <div
            style={{
              fontSize: 10.5,
              color: 'var(--studio-muted)',
              fontFamily: 'var(--studio-font-mono)',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            id · {anno.id.slice(0, 8)} · {annoIdx} of {annos.length}
          </div>
        </div>
        <button className="ed-btn-icon ed-btn-sm ed-btn-ghost" disabled>
          <Icon d={ICON.copy} size={12} />
        </button>
        <button
          className="ed-btn-icon ed-btn-sm ed-btn-ghost"
          onClick={removeSelected}
          aria-label="Delete annotation"
        >
          <Icon d={ICON.trash} size={12} />
        </button>
      </div>

      {/* Color */}
      <Section title="Color">
        <div className="flex" style={{ gap: 6 }}>
          {SWATCHES.map((c) => {
            const on =
              (anno.color || '').toLowerCase() === c.toLowerCase();
            return (
              <button
                key={c}
                onClick={() => updateSelected({ color: c })}
                aria-label={`Set color ${c}`}
                style={{
                  width: 22,
                  height: 22,
                  borderRadius: 5,
                  background: c,
                  border: on ? '2px solid #fff' : '1px solid var(--studio-line)',
                  outline: on ? `2px solid ${c}` : 'none',
                  cursor: 'pointer',
                  flex: 1,
                  padding: 0,
                }}
              />
            );
          })}
        </div>
        <div className="flex" style={{ gap: 6, marginTop: 8 }}>
          <div
            className="ed-input flex items-center"
            style={{ flex: 1, fontFamily: 'var(--studio-font-mono)', fontSize: 11, gap: 6 }}
          >
            <span
              style={{
                width: 14,
                height: 14,
                borderRadius: 3,
                background: anno.color || 'var(--studio-ink)',
                border: '1px solid var(--studio-line)',
              }}
            />
            {(anno.color || '#000000').toUpperCase()}
          </div>
          <div
            className="ed-input flex items-center"
            style={{
              width: 60,
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 11,
              justifyContent: 'space-between',
            }}
          >
            <span>{Math.round((anno.opacity ?? 1) * 100)}</span>
            <span style={{ color: 'var(--studio-muted)' }}>%</span>
          </div>
        </div>
      </Section>

      {/* Transform */}
      <Section title="Transform">
        <div
          style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}
        >
          <NumField label="X" value={`${Math.round(anno.x * 100)}%`} icon="X" />
          <NumField label="Y" value={`${Math.round(anno.y * 100)}%`} icon="Y" />
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 6,
            marginTop: 6,
          }}
        >
          <NumField
            label="W"
            value={
              anno.width != null ? `${Math.round(anno.width * 100)}%` : '—'
            }
            icon="W"
          />
          <NumField
            label="H"
            value={
              anno.height != null ? `${Math.round(anno.height * 100)}%` : '—'
            }
            icon="H"
          />
        </div>
      </Section>

      {/* Style */}
      <Section title="Style">
        <Row label="Stroke">
          <select
            className="ed-input"
            style={{
              height: 24,
              padding: '0 6px',
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 11,
            }}
            value={String(anno.strokeWidth ?? 2)}
            onChange={(e) =>
              updateSelected({
                strokeWidth: parseInt(e.target.value, 10) as 1 | 2 | 3,
              })
            }
          >
            <option value="1">Thin</option>
            <option value="2">Medium</option>
            <option value="3">Thick</option>
          </select>
        </Row>
        {anno.type === 'text' && (
          <Row label="Background">
            <select
              className="ed-input"
              style={{
                height: 24,
                padding: '0 6px',
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 11,
              }}
              value={anno.textBackground || 'pill'}
              onChange={(e) =>
                updateSelected({
                  textBackground: e.target.value as 'pill' | 'rectangle' | 'none',
                })
              }
            >
              <option value="pill">Pill</option>
              <option value="rectangle">Rect</option>
              <option value="none">None</option>
            </select>
          </Row>
        )}
        {anno.type === 'highlight' && (
          <Row label="Opacity">
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.05}
              value={anno.opacity ?? 0.4}
              onChange={(e) =>
                updateSelected({ opacity: parseFloat(e.target.value) })
              }
              style={{ width: 96 }}
            />
          </Row>
        )}
      </Section>

      {/* Content (text annotation) */}
      {anno.type === 'text' && (
        <Section title="Content">
          <input
            className="ed-input"
            style={{ width: '100%' }}
            value={anno.content || ''}
            onChange={(e) => updateSelected({ content: e.target.value })}
            placeholder="Annotation text"
          />
        </Section>
      )}
      {anno.type === 'numbered-callout' && (
        <Section title="Number">
          <input
            className="ed-input"
            type="number"
            min={1}
            max={999}
            style={{ width: '100%' }}
            value={anno.calloutNumber ?? 1}
            onChange={(e) =>
              updateSelected({ calloutNumber: parseInt(e.target.value, 10) || 1 })
            }
          />
        </Section>
      )}
    </div>
  );
}

/* ---------- Step tab ---------- */

function InspectorStep({
  step,
  stepIdx,
  onTitleChange,
  onUrlChange,
  onShowUrlChange,
  onDeleteStep,
}: InspectorProps & { step: StepWithSignedUrl }) {
  const url = step.url || step.source?.url || '';
  const captured = step.created_at
    ? new Date(step.created_at).toLocaleString()
    : null;
  const action = stepAction(step);

  return (
    <div className="flex flex-col" style={{ gap: 18 }}>
      <Section title="Step">
        <Field label="Title">
          <input
            className="ed-input"
            style={{ width: '100%' }}
            defaultValue={step.text_content || ''}
            onBlur={(e) => onTitleChange(step.id, e.target.value)}
            placeholder="Untitled step"
          />
        </Field>
        <Field label="Step number">
          <div
            className="ed-input flex items-center"
            style={{
              width: '100%',
              justifyContent: 'space-between',
              fontFamily: 'var(--studio-font-mono)',
            }}
          >
            <span>{stepIdx >= 0 ? stepIdx + 1 : '—'}</span>
            <span style={{ color: 'var(--studio-muted)' }}>auto</span>
          </div>
        </Field>
      </Section>

      <Section title="Source">
        <Field label="URL">
          <input
            className="ed-input"
            style={{
              width: '100%',
              fontFamily: 'var(--studio-font-mono)',
              fontSize: 11,
            }}
            defaultValue={url}
            onBlur={(e) => onUrlChange(step.id, e.target.value)}
            placeholder="dashboard.example.com/…"
          />
        </Field>
        <Row label="Show URL on step">
          <Toggle
            on={!!step.show_url}
            onChange={(next) => onShowUrlChange(step.id, next)}
          />
        </Row>
        {captured && (
          <Field label="Captured">
            <div
              className="ed-input flex items-center"
              style={{
                width: '100%',
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 11,
              }}
            >
              {captured}
            </div>
          </Field>
        )}
      </Section>

      <Section title="Action">
        <div
          style={{
            padding: 10,
            borderRadius: 8,
            background: 'var(--studio-surface-2)',
            border: '1px solid var(--studio-line)',
          }}
        >
          <div className="flex items-center" style={{ gap: 8 }}>
            <span
              style={{
                width: 28,
                height: 28,
                borderRadius: 6,
                background: '#fff',
                color: '#ef5a3a',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--studio-line)',
              }}
            >
              <Icon d={ICON.cursor} size={13} stroke="#ef5a3a" />
            </span>
            <div style={{ flex: 1, lineHeight: 1.2, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                }}
              >
                {action}
              </div>
              <div
                style={{
                  fontSize: 10.5,
                  color: 'var(--studio-muted)',
                  fontFamily: 'var(--studio-font-mono)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                target:{' '}
                <span style={{ color: 'var(--studio-ink-2)', fontWeight: 500 }}>
                  {step.source?.element_info?.text ||
                    step.source?.element_info?.tag ||
                    '—'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Section>

      <Section title="Display">
        <Row label="Show step number">
          <Toggle on />
        </Row>
        <Row label="Show URL on reader">
          <Toggle
            on={!!step.show_url}
            onChange={(next) => onShowUrlChange(step.id, next)}
          />
        </Row>
      </Section>

      <button
        onClick={() => onDeleteStep(step.id)}
        className="ed-btn ed-btn-sm"
        style={{
          justifyContent: 'center',
          color: '#b94627',
          borderColor: 'color-mix(in oklab, #ef5a3a 35%, transparent)',
          background: 'var(--studio-click-soft)',
        }}
      >
        <Icon d={ICON.trash} size={12} stroke="#b94627" /> Delete step
      </button>
    </div>
  );
}

/* ---------- History tab (visual placeholder) ---------- */

function InspectorHistory() {
  const accent = 'var(--studio-accent)';
  const events: Array<{
    who: string;
    what: string;
    when: string;
    current?: boolean;
    kind: 'edit' | 'add' | 'move' | 'ai' | 'capture';
  }> = [
    { who: 'You', what: 'Editing this step', when: 'now', current: true, kind: 'edit' },
    {
      who: 'Captuto AI',
      what: 'Suggested action labels',
      when: 'earlier today',
      kind: 'ai',
    },
    { who: 'You', what: 'Created tutorial', when: 'a while ago', kind: 'capture' },
  ];
  const iconForKind: Record<typeof events[number]['kind'], string> = {
    edit: ICON.pen,
    add: ICON.plus,
    move: ICON.cursor,
    ai: ICON.sparkle,
    capture: ICON.image,
  };

  return (
    <div className="flex flex-col" style={{ gap: 14 }}>
      <Section title="Activity">
        <div style={{ position: 'relative', paddingLeft: 18 }}>
          <span
            style={{
              position: 'absolute',
              left: 7,
              top: 8,
              bottom: 8,
              width: 1,
              background: 'var(--studio-line)',
            }}
          />
          {events.map((e, i) => (
            <div key={i} style={{ position: 'relative', paddingBottom: 14 }}>
              <span
                style={{
                  position: 'absolute',
                  left: -14,
                  top: 2,
                  width: 16,
                  height: 16,
                  borderRadius: 999,
                  background: e.current ? accent : 'var(--studio-surface)',
                  border: e.current
                    ? `2px solid ${accent}`
                    : '1.5px solid var(--studio-line-strong)',
                  color: e.current ? '#fff' : 'var(--studio-muted)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: e.current
                    ? `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)`
                    : 'none',
                }}
              >
                <Icon
                  d={iconForKind[e.kind]}
                  size={9}
                  stroke={e.current ? '#fff' : 'var(--studio-muted)'}
                />
              </span>
              <div
                style={{ fontSize: 12, color: 'var(--studio-ink)', lineHeight: 1.4 }}
              >
                {e.what}
              </div>
              <div
                className="flex items-center"
                style={{
                  fontSize: 10.5,
                  color: 'var(--studio-muted)',
                  marginTop: 2,
                  gap: 6,
                }}
              >
                <span>{e.who}</span>
                <span style={{ opacity: 0.5 }}>·</span>
                <span>{e.when}</span>
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}

/* ---------- Inspector primitives ---------- */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <div
        style={{
          fontSize: 10,
          color: 'var(--studio-muted)',
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.08,
          marginBottom: 8,
        }}
      >
        {title}
      </div>
      <div className="flex flex-col" style={{ gap: 8 }}>
        {children}
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          color: 'var(--studio-muted)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      {children}
    </div>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-between"
      style={{ fontSize: 12, color: 'var(--studio-ink-2)' }}
    >
      <span>{label}</span>
      {children}
    </div>
  );
}

function Toggle({
  on,
  onChange,
}: {
  on?: boolean;
  onChange?: (next: boolean) => void;
}) {
  const accent = 'var(--studio-accent)';
  return (
    <button
      type="button"
      onClick={() => onChange?.(!on)}
      aria-pressed={!!on}
      style={{
        width: 28,
        height: 16,
        borderRadius: 999,
        background: on ? accent : 'var(--studio-line-strong)',
        position: 'relative',
        display: 'inline-block',
        transition: 'background .15s',
        border: 0,
        padding: 0,
        cursor: onChange ? 'pointer' : 'default',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'absolute',
          top: 2,
          left: on ? 14 : 2,
          width: 12,
          height: 12,
          borderRadius: 999,
          background: '#fff',
          transition: 'left .15s',
          boxShadow: '0 1px 2px rgba(0,0,0,.18)',
        }}
      />
    </button>
  );
}

function NumField({
  label,
  value,
  icon,
}: {
  label?: string;
  value: string;
  icon?: string;
}) {
  return (
    <div
      className="ed-input flex items-center"
      style={{
        width: '100%',
        gap: 6,
        padding: '0 8px',
        fontFamily: 'var(--studio-font-mono)',
        fontSize: 11.5,
      }}
      title={label}
    >
      {icon && (
        <span
          style={{
            color: 'var(--studio-muted-2)',
            fontWeight: 600,
            width: 12,
          }}
        >
          {icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{value}</span>
    </div>
  );
}

function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: 24,
        textAlign: 'center',
        color: 'var(--studio-muted)',
        fontSize: 12,
        background: 'var(--studio-surface-2)',
        border: '1px dashed var(--studio-line-strong)',
        borderRadius: 10,
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
