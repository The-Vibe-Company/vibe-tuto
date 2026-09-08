'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { Icon, ICON } from './icons';
import { actionDotColor, chaptersOf, playheadSteps, stepAction } from './helpers';

interface TimelineProps {
  steps: StepWithSignedUrl[];
  selectedStepId: string | null;
  onSelectStep: (id: string) => void;
  onReorderSteps: (next: StepWithSignedUrl[]) => void;
  onAddStepAfter: (afterId: string | null) => void;
}

export function Timeline({
  steps,
  selectedStepId,
  onSelectStep,
  onReorderSteps,
  onAddStepAfter,
}: TimelineProps) {
  const chapters = useMemo(() => chaptersOf(steps), [steps]);
  const screenshots = useMemo(() => playheadSteps(steps), [steps]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [filter, setFilter] = useState('');

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    onReorderSteps(arrayMove(steps, oldIndex, newIndex));
  };

  // counters for the meta row
  const counts = screenshots.reduce(
    (acc, s) => {
      const a = stepAction(s);
      if (a === 'click') acc.click += 1;
      else if (a === 'type') acc.type += 1;
      else acc.other += 1;
      return acc;
    },
    { click: 0, type: 0, other: 0 }
  );

  return (
    <aside
      className="flex flex-col"
      style={{
        width: 296,
        flex: 'none',
        background: 'var(--studio-surface)',
        borderRight: '1px solid var(--studio-line)',
      }}
    >
      {/* Header */}
      <div style={{ padding: '12px 14px 10px', borderBottom: '1px solid var(--studio-line)' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
          <span
            style={{
              fontFamily: 'var(--studio-font-display)',
              fontWeight: 400,
              fontSize: 16,
              letterSpacing: -0.005,
            }}
          >
            Timeline
          </span>
          <div className="flex" style={{ gap: 4 }}>
            <button className="ed-btn-icon ed-btn-sm ed-btn-ghost" title="Sort">
              <Icon d={ICON.list} size={12} />
            </button>
            <button
              className="ed-btn-icon ed-btn-sm ed-btn-ghost"
              title="Add step"
              onClick={() => onAddStepAfter(steps[steps.length - 1]?.id ?? null)}
            >
              <Icon d={ICON.plus} size={13} />
            </button>
          </div>
        </div>
        {/* filter */}
        <div className="flex items-center" style={{ gap: 6 }}>
          <div
            className="ed-input flex items-center"
            style={{ flex: 1, height: 26, gap: 6, padding: '0 8px' }}
          >
            <Icon d={ICON.search} size={11} stroke="var(--studio-muted)" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter…"
              style={{
                flex: 1,
                background: 'transparent',
                border: 0,
                outline: 'none',
                fontSize: 11,
                color: 'var(--studio-ink)',
                fontFamily: 'inherit',
                minWidth: 0,
              }}
            />
            <span
              style={{
                marginLeft: 'auto',
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 9.5,
                color: 'var(--studio-muted-2)',
                background: 'var(--studio-surface-2)',
                padding: '1px 5px',
                borderRadius: 4,
              }}
            >
              ⌘K
            </span>
          </div>
        </div>
        {/* meta row */}
        <div
          className="flex items-center"
          style={{
            gap: 6,
            marginTop: 8,
            fontSize: 10.5,
            color: 'var(--studio-muted)',
          }}
        >
          {counts.click > 0 && (
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: '#ef5a3a' }}
              />
              {counts.click} click
            </span>
          )}
          {counts.type > 0 && (
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: '#2f7a4d' }}
              />
              {counts.type} input
            </span>
          )}
          {counts.other > 0 && (
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              <span
                style={{ width: 6, height: 6, borderRadius: 999, background: '#c08a2a' }}
              />
              {counts.other} other
            </span>
          )}
          <span style={{ marginLeft: 'auto', fontFamily: 'var(--studio-font-mono)' }}>
            {screenshots.length} steps
          </span>
        </div>
      </div>

      {/* Chapters list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 8px 24px' }}>
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={steps.map((s) => s.id)}
            strategy={verticalListSortingStrategy}
          >
            {chapters.length === 0 && (
              <div
                style={{
                  padding: 24,
                  textAlign: 'center',
                  color: 'var(--studio-muted)',
                  fontSize: 12,
                  background: 'var(--studio-surface-2)',
                  border: '1px dashed var(--studio-line-strong)',
                  borderRadius: 10,
                  margin: '8px',
                }}
              >
                No steps yet.
              </div>
            )}
            {chapters.map((ch) => {
              const isCollapsed = collapsed[ch.id];
              const visibleItems = filter
                ? ch.items.filter((s) =>
                    (s.text_content || '').toLowerCase().includes(filter.toLowerCase())
                  )
                : ch.items;
              return (
                <div key={ch.id} style={{ marginBottom: 6 }}>
                  <button
                    onClick={() =>
                      setCollapsed((c) => ({ ...c, [ch.id]: !isCollapsed }))
                    }
                    style={{
                      width: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '6px 8px',
                      borderRadius: 6,
                      background: 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--studio-ink-2)',
                      textTransform: 'uppercase',
                      letterSpacing: 0.06,
                      fontFamily: 'inherit',
                    }}
                  >
                    <Icon
                      d={isCollapsed ? ICON.chevronR : ICON.chevronD}
                      size={11}
                      stroke="var(--studio-muted)"
                    />
                    <span>{ch.label}</span>
                    <span
                      style={{
                        marginLeft: 'auto',
                        fontFamily: 'var(--studio-font-mono)',
                        fontSize: 10,
                        color: 'var(--studio-muted)',
                        background: 'var(--studio-surface-2)',
                        padding: '1px 6px',
                        borderRadius: 999,
                        border: '1px solid var(--studio-line)',
                        textTransform: 'none',
                        letterSpacing: 0,
                      }}
                    >
                      {ch.items.length}
                    </span>
                  </button>
                  {!isCollapsed && (
                    <div style={{ position: 'relative', paddingLeft: 14, marginTop: 2 }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: 8,
                          top: 8,
                          bottom: 8,
                          width: 1,
                          background: 'var(--studio-line)',
                        }}
                      />
                      {visibleItems.map((s) => (
                        <SortableTimelineRow
                          key={s.id}
                          step={s}
                          screenshots={screenshots}
                          active={s.id === selectedStepId}
                          onClick={() => onSelectStep(s.id)}
                        />
                      ))}
                      <button
                        onClick={() =>
                          onAddStepAfter(
                            ch.items[ch.items.length - 1]?.id ??
                              (ch.implicit ? null : ch.id)
                          )
                        }
                        style={{
                          marginLeft: -14,
                          width: '100%',
                          padding: '5px 8px 5px 28px',
                          textAlign: 'left',
                          background: 'transparent',
                          border: 0,
                          cursor: 'pointer',
                          fontSize: 11,
                          color: 'var(--studio-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                          fontFamily: 'inherit',
                        }}
                      >
                        <Icon d={ICON.plus} size={11} /> Add step
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      </div>
    </aside>
  );
}

function SortableTimelineRow({
  step,
  screenshots,
  active,
  onClick,
}: {
  step: StepWithSignedUrl;
  screenshots: StepWithSignedUrl[];
  active: boolean;
  onClick: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });
  const dotColor = actionDotColor(step);
  const num = screenshots.findIndex((x) => x.id === step.id) + 1;
  const numLabel = num > 0 ? String(num).padStart(2, '0') : '—';
  const accent = 'var(--studio-accent)';
  const isHeading = step.step_type === 'heading';
  const isDivider = step.step_type === 'divider';
  const labelText =
    step.text_content?.trim() ||
    (isHeading ? 'Section' : isDivider ? 'Divider' : 'Untitled step');

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick();
          }
        }}
        style={{
          position: 'relative',
          display: 'flex',
          gap: 10,
          padding: '6px 8px 6px 14px',
          borderRadius: 8,
          background: active ? 'var(--studio-surface-2)' : 'transparent',
          border: active ? '1px solid var(--studio-line-strong)' : '1px solid transparent',
          cursor: 'pointer',
          width: '100%',
          textAlign: 'left',
          marginBottom: 2,
          alignItems: 'center',
          boxShadow: active ? 'var(--studio-shadow-1)' : 'none',
        }}
      >
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            fontSize: 10,
            color: 'var(--studio-muted-2)',
            opacity: active ? 1 : 0,
            fontFamily: 'var(--studio-font-mono)',
          }}
        >
          ⋮⋮
        </span>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            left: -6,
            top: '50%',
            transform: 'translateY(-50%)',
            width: 12,
            height: 12,
            borderRadius: 999,
            background: active ? accent : 'var(--studio-surface)',
            border: `2px solid ${active ? accent : dotColor}`,
            boxShadow: active
              ? `0 0 0 3px color-mix(in oklab, ${accent} 18%, transparent)`
              : 'none',
            zIndex: 1,
          }}
        />
        {/* mini-thumb (real screenshot when present) */}
        <span
          aria-hidden
          style={{
            flex: 'none',
            width: 64,
            height: 40,
            borderRadius: 5,
            overflow: 'hidden',
            border: '1px solid var(--studio-line)',
            background: 'var(--studio-surface-2)',
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {step.signedScreenshotUrl ? (
            <Image
              src={step.signedScreenshotUrl}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              loading="lazy"
            />
          ) : (
            <Icon
              d={isHeading ? ICON.text : isDivider ? ICON.text : ICON.image}
              size={14}
              stroke="var(--studio-muted-2)"
            />
          )}
        </span>
        <span style={{ flex: 1, minWidth: 0 }}>
          <span className="flex items-center" style={{ gap: 6 }}>
            <span
              style={{
                fontFamily: 'var(--studio-font-mono)',
                fontSize: 10,
                color: 'var(--studio-muted)',
                fontWeight: 600,
              }}
            >
              {numLabel}
            </span>
            <span
              style={{
                fontSize: 11.5,
                fontWeight: 500,
                color: 'var(--studio-ink)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
              }}
            >
              {labelText}
            </span>
          </span>
          <span
            className="flex items-center"
            style={{
              gap: 4,
              marginTop: 2,
              fontSize: 9.5,
              color: 'var(--studio-muted)',
              fontFamily: 'var(--studio-font-mono)',
            }}
          >
            <span
              style={{ width: 5, height: 5, borderRadius: 999, background: dotColor }}
            />
            <span style={{ textTransform: 'uppercase', letterSpacing: 0.04, fontWeight: 600 }}>
              {stepAction(step)}
            </span>
            <span style={{ opacity: 0.5 }}>·</span>
            <span
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {(step.annotations || []).length} anno
            </span>
          </span>
        </span>
      </div>
    </div>
  );
}
