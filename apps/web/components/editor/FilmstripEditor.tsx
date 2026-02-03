'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
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
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  GripVertical,
  Trash2,
  Pencil,
  X,
  Circle,
  ArrowRight,
  Type,
  Highlighter,
  EyeOff,
  Play,
  ChevronLeft,
  Check,
  Loader2,
  ZoomIn,
  ZoomOut,
  MousePointer2,
  Plus,
  FileText,
  Heading,
  SeparatorHorizontal,
  Image as ImageIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InlineCaption } from './InlineCaption';
import { AnnotationCanvas } from './AnnotationCanvas';
import type { Tutorial, StepWithSignedUrl, Annotation, AnnotationType } from '@/lib/types/editor';
import type { SaveStatus } from './EditorClient';
import { cn } from '@/lib/utils';

// Step types for adding new steps
export type NewStepType = 'text' | 'heading' | 'divider';

interface FilmstripEditorProps {
  tutorial: Tutorial;
  steps: StepWithSignedUrl[];
  saveStatus: SaveStatus;
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
  onStepCaptionChange: (stepId: string, caption: string) => void;
  onStepAnnotationsChange: (stepId: string, annotations: Annotation[]) => void;
  onDeleteStep: (stepId: string) => void;
  onReorderSteps: (newSteps: StepWithSignedUrl[]) => void;
  onAddStep?: (type: NewStepType, afterStepId?: string) => void;
  onPreview: () => void;
}

// Thumbnail item in the filmstrip
function FilmstripThumbnail({
  step,
  stepNumber,
  isSelected,
  onSelect,
}: {
  step: StepWithSignedUrl;
  stepNumber: number;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: step.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group relative cursor-pointer transition-all duration-200',
        isDragging && 'z-50 opacity-70'
      )}
      onClick={onSelect}
    >
      {/* Step number badge */}
      <div className="absolute -left-1 -top-1 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-stone-900 shadow-lg ring-2 ring-stone-900">
        {stepNumber}
      </div>

      {/* Thumbnail container */}
      <div
        className={cn(
          'relative overflow-hidden rounded-lg border-2 transition-all duration-200',
          isSelected
            ? 'border-amber-400 shadow-lg shadow-amber-400/20'
            : 'border-stone-700 hover:border-stone-500'
        )}
      >
        {/* Thumbnail image or type indicator */}
        <div className="relative aspect-video bg-stone-800">
          {step.signedScreenshotUrl ? (
            <>
              <img
                src={step.signedScreenshotUrl}
                alt={`Step ${stepNumber}`}
                className="h-full w-full object-cover object-top"
                draggable={false}
              />
              {/* Click indicator on thumbnail */}
              {step.click_x && step.click_y && step.viewport_width && step.viewport_height && (
                <div
                  className="absolute h-3 w-3 rounded-full bg-amber-400 shadow-lg"
                  style={{
                    left: `${(step.click_x / step.viewport_width) * 100}%`,
                    top: `${(step.click_y / step.viewport_height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                />
              )}
            </>
          ) : step.click_type === 'heading' ? (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/20">
              <Heading className="h-6 w-6 text-amber-400" />
            </div>
          ) : step.click_type === 'divider' ? (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-stone-700 to-stone-800">
              <SeparatorHorizontal className="h-6 w-6 text-stone-500" />
            </div>
          ) : (
            <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-500/20 to-indigo-500/20">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
          )}

          {/* Selection overlay */}
          {isSelected && (
            <div className="absolute inset-0 bg-amber-400/10" />
          )}
        </div>

        {/* Drag handle overlay */}
        <div
          {...attributes}
          {...listeners}
          className="absolute inset-x-0 bottom-0 flex h-6 cursor-grab items-center justify-center bg-gradient-to-t from-stone-900/80 to-transparent opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3 w-3 text-stone-400" />
        </div>
      </div>

      {/* Caption preview */}
      <p className="mt-1.5 line-clamp-2 px-0.5 text-xs text-stone-400">
        {step.text_content ? (
          <span dangerouslySetInnerHTML={{ __html: step.text_content.replace(/<[^>]*>/g, '').slice(0, 50) }} />
        ) : (
          <span className="italic text-stone-600">Sans description</span>
        )}
      </p>
    </div>
  );
}

const ANNOTATION_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Cercle' },
  { type: 'arrow', icon: ArrowRight, label: 'Flèche' },
  { type: 'text', icon: Type, label: 'Texte' },
  { type: 'highlight', icon: Highlighter, label: 'Surligner' },
  { type: 'blur', icon: EyeOff, label: 'Flouter' },
];

// Add step menu component
function AddStepMenu({
  onAdd,
  position = 'bottom',
}: {
  onAdd: (type: NewStepType) => void;
  position?: 'bottom' | 'inline';
}) {
  const [isOpen, setIsOpen] = useState(false);

  const stepTypes = [
    { type: 'text' as const, icon: FileText, label: 'Texte', desc: 'Ajouter un paragraphe' },
    { type: 'heading' as const, icon: Heading, label: 'Titre', desc: 'Titre de section' },
    { type: 'divider' as const, icon: SeparatorHorizontal, label: 'Séparateur', desc: 'Diviser les sections' },
  ];

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          'gap-2 text-stone-400 hover:bg-stone-800 hover:text-amber-400',
          position === 'bottom' && 'w-full justify-center border border-dashed border-stone-700 py-3'
        )}
        onClick={() => setIsOpen(!isOpen)}
      >
        <Plus className="h-4 w-4" />
        <span className="text-xs">Ajouter une étape</span>
      </Button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 right-0 z-50 mt-1 rounded-lg border border-stone-700 bg-stone-800 p-1 shadow-xl">
            {stepTypes.map(({ type, icon: Icon, label, desc }) => (
              <button
                key={type}
                className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left hover:bg-stone-700"
                onClick={() => {
                  onAdd(type);
                  setIsOpen(false);
                }}
              >
                <Icon className="h-4 w-4 text-amber-400" />
                <div>
                  <p className="text-sm font-medium text-stone-200">{label}</p>
                  <p className="text-xs text-stone-500">{desc}</p>
                </div>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export function FilmstripEditor({
  tutorial,
  steps,
  saveStatus,
  selectedStepId,
  onSelectStep,
  onStepCaptionChange,
  onStepAnnotationsChange,
  onDeleteStep,
  onReorderSteps,
  onAddStep,
  onPreview,
}: FilmstripEditorProps) {
  const [zoom, setZoom] = useState(0.6);
  const [annotationMode, setAnnotationMode] = useState(false);
  const [activeTool, setActiveTool] = useState<AnnotationType | null>(null);
  const mainContentRef = useRef<HTMLDivElement>(null);
  const screenshotContainerRef = useRef<HTMLDivElement>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedStep = steps.find((s) => s.id === selectedStepId);
  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);

  // Auto-select first step if none selected
  useEffect(() => {
    if (!selectedStepId && steps.length > 0) {
      onSelectStep(steps[0].id);
    }
  }, [selectedStepId, steps, onSelectStep]);

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

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.15, 1.2));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.15, 0.3));

  const annotations = selectedStep?.annotations || [];

  return (
    <div className="flex h-screen flex-col bg-stone-950">
      {/* Header */}
      <header className="flex h-14 items-center justify-between border-b border-stone-800 bg-stone-900 px-4">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 text-stone-400 hover:bg-stone-800 hover:text-stone-200"
            onClick={() => window.history.back()}
          >
            <ChevronLeft className="h-4 w-4" />
            <span className="font-medium">Retour</span>
          </Button>

          <div className="h-5 w-px bg-stone-700" />

          <div className="flex items-center gap-2">
            {saveStatus === 'saving' && (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <span className="text-sm text-stone-400">Sauvegarde...</span>
              </>
            )}
            {saveStatus === 'saved' && (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-sm text-stone-400">Sauvegardé</span>
              </>
            )}
            {saveStatus === 'error' && (
              <span className="text-sm text-red-400">Erreur de sauvegarde</span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="gap-2 bg-amber-400/10 text-amber-400 hover:bg-amber-400/20"
            onClick={onPreview}
          >
            <Play className="h-4 w-4" />
            <span className="font-medium">Aperçu</span>
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Left Filmstrip Sidebar */}
        <aside className="w-44 flex-shrink-0 border-r border-stone-800 bg-stone-900">
          <div className="flex h-full flex-col">
            {/* Tutorial title */}
            <div className="border-b border-stone-800 p-3">
              <h2 className="truncate text-sm font-semibold text-stone-200">
                {tutorial.title}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500">
                {steps.length} étape{steps.length > 1 ? 's' : ''}
              </p>
            </div>

            {/* Thumbnails */}
            <div className="flex-1 overflow-y-auto p-3">
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={steps.map((s) => s.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-4">
                    {steps.map((step, index) => (
                      <FilmstripThumbnail
                        key={step.id}
                        step={step}
                        stepNumber={index + 1}
                        isSelected={selectedStepId === step.id}
                        onSelect={() => onSelectStep(step.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>

              {steps.length === 0 && (
                <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-stone-700 text-center">
                  <p className="text-xs text-stone-500">Aucune étape</p>
                </div>
              )}

              {/* Add step button */}
              {onAddStep && (
                <div className="mt-4">
                  <AddStepMenu
                    onAdd={(type) => onAddStep(type, selectedStepId || undefined)}
                    position="bottom"
                  />
                </div>
              )}
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <main
          ref={mainContentRef}
          className="flex flex-1 flex-col overflow-hidden bg-stone-950"
        >
          {selectedStep ? (
            <>
              {/* Toolbar */}
              <div className="flex items-center justify-between border-b border-stone-800 bg-stone-900/50 px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 text-sm font-bold text-stone-900">
                    {selectedStepIndex + 1}
                  </span>
                  <span className="text-sm text-stone-400">
                    sur {steps.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {/* Zoom controls */}
                  <div className="flex items-center gap-1 rounded-lg bg-stone-800 p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                      onClick={handleZoomOut}
                      disabled={zoom <= 0.3}
                    >
                      <ZoomOut className="h-4 w-4" />
                    </Button>
                    <span className="w-12 text-center text-xs text-stone-400">
                      {Math.round(zoom * 100)}%
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-stone-400 hover:bg-stone-700 hover:text-stone-200"
                      onClick={handleZoomIn}
                      disabled={zoom >= 1.2}
                    >
                      <ZoomIn className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="mx-2 h-5 w-px bg-stone-700" />

                  {/* Annotation toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className={cn(
                      'gap-2',
                      annotationMode
                        ? 'bg-amber-400/20 text-amber-400'
                        : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                    )}
                    onClick={() => {
                      setAnnotationMode(!annotationMode);
                      if (annotationMode) setActiveTool(null);
                    }}
                  >
                    {annotationMode ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                    <span>{annotationMode ? 'Terminer' : 'Annoter'}</span>
                  </Button>

                  {/* Delete */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-stone-400 hover:bg-red-500/20 hover:text-red-400"
                    onClick={() => {
                      if (confirm('Supprimer cette étape ?')) {
                        onDeleteStep(selectedStep.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Annotation toolbar */}
              {annotationMode && (
                <div className="flex items-center gap-1 border-b border-stone-800 bg-stone-900/30 px-4 py-2">
                  {ANNOTATION_TOOLS.map(({ type, icon: Icon, label }) => (
                    <Button
                      key={type}
                      variant="ghost"
                      size="sm"
                      className={cn(
                        'gap-1.5',
                        activeTool === type
                          ? 'bg-amber-400/20 text-amber-400'
                          : 'text-stone-400 hover:bg-stone-800 hover:text-stone-200'
                      )}
                      onClick={() => setActiveTool(activeTool === type ? null : type)}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="text-xs">{label}</span>
                    </Button>
                  ))}
                  <div className="mx-2 h-5 w-px bg-stone-700" />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 text-red-400 hover:bg-red-500/20"
                    onClick={() => {
                      if (confirm('Supprimer toutes les annotations ?')) {
                        onStepAnnotationsChange(selectedStep.id, []);
                      }
                    }}
                    disabled={annotations.length === 0}
                  >
                    <Trash2 className="h-4 w-4" />
                    <span className="text-xs">Effacer tout</span>
                  </Button>
                </div>
              )}

              {/* Content area */}
              <div className="flex flex-1 items-start justify-center overflow-auto p-6">
                {selectedStep.signedScreenshotUrl ? (
                  // Screenshot step
                  <div
                    className="relative rounded-lg border border-stone-800 bg-stone-900 shadow-2xl transition-transform duration-200"
                    style={{
                      transform: `scale(${zoom})`,
                      transformOrigin: 'top center',
                    }}
                  >
                    <div ref={screenshotContainerRef} className="relative">
                      <img
                        src={selectedStep.signedScreenshotUrl}
                        alt={`Step ${selectedStepIndex + 1}`}
                        className="block max-w-none"
                        draggable={false}
                      />

                      {/* Click indicator */}
                      {selectedStep.click_x &&
                        selectedStep.click_y &&
                        selectedStep.viewport_width &&
                        selectedStep.viewport_height && (
                          <div
                            className="pointer-events-none absolute z-10"
                            style={{
                              left: `${(selectedStep.click_x / selectedStep.viewport_width) * 100}%`,
                              top: `${(selectedStep.click_y / selectedStep.viewport_height) * 100}%`,
                              transform: 'translate(-15%, -10%)',
                            }}
                          >
                            <MousePointer2
                              className="h-8 w-8 drop-shadow-lg"
                              fill="#fbbf24"
                              stroke="#92400e"
                              strokeWidth={1.5}
                            />
                          </div>
                        )}

                      {/* Annotation canvas overlay (both edit and display mode) */}
                      <AnnotationCanvas
                        annotations={annotations}
                        activeTool={annotationMode ? activeTool : null}
                        onAddAnnotation={(annotation) => {
                          onStepAnnotationsChange(selectedStep.id, [...annotations, annotation]);
                        }}
                        containerRef={screenshotContainerRef}
                      />
                    </div>
                  </div>
                ) : selectedStep.click_type === 'heading' ? (
                  // Heading step - large editable title
                  <div className="w-full max-w-2xl rounded-xl border border-stone-800 bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-12 text-center">
                    <Heading className="mx-auto mb-4 h-12 w-12 text-amber-400" />
                    <p className="text-xs uppercase tracking-wider text-stone-500">
                      Titre de section
                    </p>
                    <p className="mt-4 text-stone-400">
                      Utilisez la description ci-dessous pour définir le titre
                    </p>
                  </div>
                ) : selectedStep.click_type === 'divider' ? (
                  // Divider step
                  <div className="w-full max-w-2xl rounded-xl border border-stone-800 bg-stone-900 p-12 text-center">
                    <div className="mx-auto my-8 h-px w-32 bg-gradient-to-r from-transparent via-stone-600 to-transparent" />
                    <SeparatorHorizontal className="mx-auto h-8 w-8 text-stone-600" />
                    <p className="mt-4 text-sm text-stone-500">
                      Séparateur de section
                    </p>
                  </div>
                ) : (
                  // Text step - rich text editing area
                  <div className="w-full max-w-2xl rounded-xl border border-stone-800 bg-gradient-to-br from-blue-500/10 to-indigo-500/10 p-8">
                    <div className="flex items-center gap-3 mb-4">
                      <FileText className="h-6 w-6 text-blue-400" />
                      <span className="text-xs uppercase tracking-wider text-stone-500">
                        Étape texte
                      </span>
                    </div>
                    <p className="text-stone-400">
                      Utilisez la description ci-dessous pour rédiger le contenu de cette étape
                    </p>
                  </div>
                )}
              </div>

              {/* Caption editor at bottom */}
              <div className="border-t border-stone-800 bg-stone-900 p-4">
                <div className="mx-auto max-w-2xl">
                  <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-stone-500">
                    Description de l'étape
                  </label>
                  <div className="rounded-lg border border-stone-700 bg-stone-800 px-3 py-2 focus-within:border-amber-400 focus-within:ring-1 focus-within:ring-amber-400/20">
                    <InlineCaption
                      content={selectedStep.text_content || ''}
                      onChange={(caption) => onStepCaptionChange(selectedStep.id, caption)}
                      placeholder="Décrivez cette étape... ex: Cliquez sur le bouton Paramètres"
                      darkMode
                    />
                  </div>
                  {selectedStep.url && (
                    <p className="mt-2 truncate text-xs text-stone-600">
                      {selectedStep.url}
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-stone-800">
                  <MousePointer2 className="h-8 w-8 text-stone-600" />
                </div>
                <p className="text-stone-500">Sélectionnez une étape</p>
                <p className="mt-1 text-sm text-stone-600">
                  Cliquez sur une miniature à gauche
                </p>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
