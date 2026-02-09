'use client';

import { useCallback, useState, useRef, useEffect } from 'react';
import { Pencil } from 'lucide-react';
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
import { Plus, FileText, Heading, Minus, Sparkles, Layers } from 'lucide-react';
import type { Tutorial, StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import type { SaveStatus } from './EditorClient';
import { DocHeader } from './DocHeader';
import { DocStepCard } from './DocStepCard';
import { SourcesSidebar } from './SourcesSidebar';
import { AddStepBetween } from './AddStepBetween';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

export type NewStepType = 'text' | 'heading' | 'divider';

interface DocEditorProps {
  tutorial: Tutorial;
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  onTitleChange: (title: string) => void;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepDescriptionChange: (stepId: string, description: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onStepUrlChange: (stepId: string, url: string) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (newSteps: StepWithSignedUrl[]) => void;
  onAddStep: (type: NewStepType, afterStepId?: string | null) => void;
  onCreateStepFromSource: (source: SourceWithSignedUrl) => void;
  onRemoveStepImage: (stepId: string) => void;
  onSetStepImage: (stepId: string, source: SourceWithSignedUrl) => void;
  // AI Generation props
  onGenerateClick?: () => void;
  isGenerating?: boolean;
}

export function DocEditor({
  tutorial,
  sources,
  steps,
  saveStatus,
  onTitleChange,
  onStepCaptionChange,
  onStepDescriptionChange,
  onStepAnnotationsChange,
  onStepUrlChange,
  onDeleteStep,
  onReorderSteps,
  onAddStep,
  onCreateStepFromSource,
  onRemoveStepImage,
  onSetStepImage,
  onGenerateClick,
  isGenerating,
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
    <TooltipProvider delayDuration={100}>
      <div className="min-h-screen bg-background">
        <DocHeader
          saveStatus={saveStatus}
          tutorialId={tutorial.id}
          tutorialTitle={tutorial.title}
          tutorialSlug={tutorial.slug}
          onGenerateClick={onGenerateClick}
          isGenerating={isGenerating}
          hasSourcesForGeneration={sources.length > 0}
        />

        {/* Subtle dot grid background */}
        <div
          className="relative"
          style={{
            backgroundImage: 'radial-gradient(circle, hsl(var(--border) / 0.3) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        >
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex gap-8">
              {/* Main content area */}
              <main className="min-w-0 flex-1">
                <div className="mx-auto max-w-4xl">
                  {/* Tutorial header */}
                  <div className="mb-10">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-2">
                        <EditableTitle
                          value={tutorial.title || ''}
                          onChange={onTitleChange}
                          placeholder="Untitled"
                        />
                        {tutorial.description && (
                          <p className="text-sm text-muted-foreground max-w-2xl leading-relaxed">
                            {tutorial.description}
                          </p>
                        )}
                      </div>
                      {steps.length > 0 && (
                        <Badge variant="secondary" className="gap-1.5 shrink-0">
                          <Layers className="h-3 w-3" />
                          <span className="tabular-nums">{steps.length}</span>
                          <span>steps</span>
                        </Badge>
                      )}
                    </div>
                    <div className="mt-6 h-px bg-gradient-to-r from-border via-border/50 to-transparent" />
                  </div>

                  {/* Steps list */}
                  <div className="space-y-0">
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
                          const isImageStep = step.step_type === 'image';
                          const isTextStep = step.step_type === 'text';
                          if (isImageStep || isTextStep) {
                            screenshotStepNumber++;
                          }

                          // Find previous step's URL (skip headings/dividers)
                          let previousStepUrl: string | null = null;
                          for (let i = index - 1; i >= 0; i--) {
                            const prev = steps[i];
                            if (prev.step_type === 'heading' || prev.step_type === 'divider') continue;
                            previousStepUrl = prev.url || prev.source?.url || null;
                            break;
                          }

                          return (
                            <div key={step.id}>
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
                                previousStepUrl={previousStepUrl}
                                onCaptionChange={(caption) => onStepCaptionChange(step.id, caption)}
                                onDescriptionChange={(description) => onStepDescriptionChange(step.id, description)}
                                onAnnotationsChange={(annotations) =>
                                  onStepAnnotationsChange(step.id, annotations)
                                }
                                onUrlChange={(url) => onStepUrlChange(step.id, url)}
                                onDelete={() => onDeleteStep(step.id)}
                                onRemoveImage={() => onRemoveStepImage(step.id)}
                                onSetImage={(source) => onSetStepImage(step.id, source)}
                              />
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
                      <Card className="border-dashed border-2">
                        <CardContent className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 p-4 mb-5">
                            <Sparkles className="h-8 w-8 text-primary/60" />
                          </div>
                          <h3 className="text-lg font-semibold text-foreground mb-1.5">
                            No steps yet
                          </h3>
                          <p className="text-sm text-muted-foreground mb-8 max-w-sm leading-relaxed">
                            Start creating your tutorial by adding steps from the timeline or by creating steps manually.
                          </p>
                          <div className="flex items-center gap-3">
                            <AddStepButton
                              icon={FileText}
                              label="Text"
                              onClick={() => onAddStep('text', null)}
                            />
                            <AddStepButton
                              icon={Heading}
                              label="Heading"
                              onClick={() => onAddStep('heading', null)}
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Bottom add step buttons */}
                    {steps.length > 0 && (
                      <div className="flex items-center justify-center gap-2 pt-4 pb-8">
                        <AddStepButton
                          icon={FileText}
                          label="Text"
                          onClick={() => onAddStep('text', steps[steps.length - 1]?.id)}
                        />
                        <AddStepButton
                          icon={Heading}
                          label="Heading"
                          onClick={() => onAddStep('heading', steps[steps.length - 1]?.id)}
                        />
                        <AddStepButton
                          icon={Minus}
                          label="Divider"
                          onClick={() => onAddStep('divider', steps[steps.length - 1]?.id)}
                        />
                      </div>
                    )}
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
      </div>
    </TooltipProvider>
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
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          onClick={onClick}
          className="h-9 gap-2 border-dashed hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
        >
          <Plus className="h-3.5 w-3.5" />
          <Icon className="h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Add a {label.toLowerCase()} step
      </TooltipContent>
    </Tooltip>
  );
}

// Editable title component
function EditableTitle({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  useEffect(() => {
    setEditValue(value);
  }, [value]);

  const handleSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== value) {
      onChange(trimmed);
    } else {
      setEditValue(value);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        ref={inputRef}
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSubmit}
        onKeyDown={handleKeyDown}
        className="text-3xl font-bold tracking-tight text-foreground bg-transparent border-b-2 border-primary outline-none w-full max-w-lg"
        placeholder={placeholder}
      />
    );
  }

  return (
    <button
      onClick={() => setIsEditing(true)}
      className="group flex items-center gap-2 text-left"
    >
      <h1 className="text-3xl font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
        {value || placeholder}
      </h1>
      <Pencil className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
    </button>
  );
}
