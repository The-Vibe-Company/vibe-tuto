'use client';

import { useCallback } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, FileText, Heading, Minus } from 'lucide-react';
import type { Tutorial, StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import type { SaveStatus } from './EditorClient';
import { DocHeader } from './DocHeader';
import { DocStepCard } from './DocStepCard';
import { SourcesSidebar } from './SourcesSidebar';
import { AddStepBetween } from './AddStepBetween';

export type NewStepType = 'text' | 'heading' | 'divider';

interface DocEditorProps {
  tutorial: Tutorial;
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (newSteps: StepWithSignedUrl[]) => void;
  onAddStep: (type: NewStepType, afterStepId?: string | null) => void;
  onCreateStepFromSource: (source: SourceWithSignedUrl) => void;
  onRemoveStepImage: (stepId: string) => void;
  onSetStepImage: (stepId: string, source: SourceWithSignedUrl) => void;
}

export function DocEditor({
  tutorial,
  sources,
  steps,
  saveStatus,
  selectedStepId,
  onSelectStep,
  onStepCaptionChange,
  onStepAnnotationsChange,
  onDeleteStep,
  onReorderSteps,
  onAddStep,
  onCreateStepFromSource,
  onRemoveStepImage,
  onSetStepImage,
}: DocEditorProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;

      if (over && active.id !== over.id) {
        const oldIndex = steps.findIndex((s) => s.id === active.id);
        const newIndex = steps.findIndex((s) => s.id === over.id);
        const newSteps = arrayMove(steps, oldIndex, newIndex);
        onReorderSteps(newSteps);
      }
    },
    [steps, onReorderSteps]
  );

  // Count only screenshot steps for numbering
  let screenshotStepNumber = 0;

  return (
    <div className="min-h-screen bg-slate-50">
      <DocHeader saveStatus={saveStatus} />

      <div className="mx-auto max-w-7xl px-4 py-8">
        <div className="flex gap-6">
          {/* Main content area */}
          <main className="min-w-0 flex-1">
            {/* Tutorial header */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">
                {tutorial.title || 'Sans titre'}
              </h1>
              {tutorial.description && (
                <p className="mt-2 text-slate-600">{tutorial.description}</p>
              )}
            </div>

            {/* Steps list */}
            <div className="space-y-4">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  {steps.map((step, index) => {
                    // Only count image and text steps for the numbered badge
                    const isImageStep = step.step_type === 'image';
                    const isTextStep = step.step_type === 'text';
                    if (isImageStep || isTextStep) {
                      screenshotStepNumber++;
                    }

                    return (
                      <div key={step.id}>
                        {/* Add step button before the first step */}
                        {index === 0 && (
                          <AddStepBetween
                            onAddStep={(type) => onAddStep(type, null)}
                          />
                        )}
                        <DocStepCard
                          step={step}
                          stepNumber={
                            step.step_type === 'heading' || step.step_type === 'divider'
                              ? 0
                              : screenshotStepNumber
                          }
                          sources={sources}
                          onCaptionChange={(caption) => onStepCaptionChange(step.id, caption)}
                          onAnnotationsChange={(annotations) =>
                            onStepAnnotationsChange(step.id, annotations)
                          }
                          onDelete={() => onDeleteStep(step.id)}
                          onRemoveImage={() => onRemoveStepImage(step.id)}
                          onSetImage={(source) => onSetStepImage(step.id, source)}
                        />
                        {/* Add step button after each step */}
                        <AddStepBetween
                          onAddStep={(type) => onAddStep(type, step.id)}
                        />
                      </div>
                    );
                  })}
                </SortableContext>
              </DndContext>

              {/* Empty state */}
              {steps.length === 0 && (
                <div className="rounded-xl border-2 border-dashed border-slate-200 py-16 text-center">
                  <p className="text-slate-500">Aucune étape pour le moment.</p>
                  <p className="mt-1 text-sm text-slate-400">
                    Ajoutez une étape ci-dessous.
                  </p>
                </div>
              )}

              {/* Add step buttons */}
              <div className="flex items-center justify-center gap-2 pt-4">
                <AddStepButton
                  icon={FileText}
                  label="Texte"
                  onClick={() => onAddStep('text', steps[steps.length - 1]?.id)}
                />
                <AddStepButton
                  icon={Heading}
                  label="Titre"
                  onClick={() => onAddStep('heading', steps[steps.length - 1]?.id)}
                />
                <AddStepButton
                  icon={Minus}
                  label="Séparateur"
                  onClick={() => onAddStep('divider', steps[steps.length - 1]?.id)}
                />
              </div>
            </div>
          </main>

          {/* Right sidebar - Sources */}
          <SourcesSidebar
            sources={sources}
            onCreateStepFromSource={onCreateStepFromSource}
          />
        </div>
      </div>
    </div>
  );
}

// Small button component for adding steps
function AddStepButton({
  icon: Icon,
  label,
  onClick,
}: {
  icon: typeof FileText;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-2 rounded-lg border border-dashed border-slate-300 bg-white px-4 py-2 text-sm text-slate-500 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600"
    >
      <Plus className="h-4 w-4" />
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}
