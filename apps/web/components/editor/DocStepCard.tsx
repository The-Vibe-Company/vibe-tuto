'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, FileText, Heading, Minus, ImageOff, ImagePlus, X } from 'lucide-react';
import type { StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import { InlineCaption } from './InlineCaption';
import { StepScreenshot } from './StepScreenshot';
import { cn } from '@/lib/utils';

interface DocStepCardProps {
  step: StepWithSignedUrl;
  stepNumber: number;
  sources?: SourceWithSignedUrl[];
  onCaptionChange?: (caption: string) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onDelete?: () => void;
  onRemoveImage?: () => void;
  onSetImage?: (source: SourceWithSignedUrl) => void;
  readOnly?: boolean;
}

export function DocStepCard({
  step,
  stepNumber,
  sources = [],
  onCaptionChange,
  onAnnotationsChange,
  onDelete,
  onRemoveImage,
  onSetImage,
  readOnly = false,
}: DocStepCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const annotations = step.annotations || [];

  // Filter sources that have screenshots
  const availableSources = sources.filter((s) => s.signedScreenshotUrl);

  // Handler to update a single annotation
  const handleUpdateAnnotation = useCallback(
    (id: string, updates: Partial<Annotation>) => {
      if (readOnly) return;
      const updatedAnnotations = annotations.map((ann) =>
        ann.id === id ? { ...ann, ...updates } : ann
      );
      onAnnotationsChange?.(updatedAnnotations);
    },
    [annotations, onAnnotationsChange, readOnly]
  );

  // Handler to delete a single annotation
  const handleDeleteAnnotation = useCallback(
    (id: string) => {
      if (readOnly) return;
      const updatedAnnotations = annotations.filter((ann) => ann.id !== id);
      onAnnotationsChange?.(updatedAnnotations);
    },
    [annotations, onAnnotationsChange, readOnly]
  );

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

  const hasScreenshot = !!step.signedScreenshotUrl;
  const isHeading = step.step_type === 'heading';
  const isDivider = step.step_type === 'divider';

  // Divider step
  if (isDivider) {
    return (
      <div
        ref={readOnly ? undefined : setNodeRef}
        style={readOnly ? undefined : style}
        className={cn(
          'group relative py-4',
          !readOnly && isDragging && 'z-50 opacity-50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-center gap-4">
          {/* Drag handle (hidden in readOnly) */}
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Divider line */}
          <div className="flex flex-1 items-center gap-3">
            <div className="h-px flex-1 bg-slate-200" />
            <Minus className="h-4 w-4 text-slate-300" />
            <div className="h-px flex-1 bg-slate-200" />
          </div>

          {/* Delete (hidden in readOnly) */}
          {!readOnly && (
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'text-slate-300 transition-all hover:text-red-500',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Heading step
  if (isHeading) {
    return (
      <div
        ref={readOnly ? undefined : setNodeRef}
        style={readOnly ? undefined : style}
        className={cn(
          'group relative py-2',
          !readOnly && isDragging && 'z-50 opacity-50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-4">
          {/* Drag handle (hidden in readOnly) */}
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'mt-2 cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Icon */}
          <div className="mt-1.5 flex h-6 w-6 items-center justify-center rounded bg-violet-100">
            <Heading className="h-3.5 w-3.5 text-violet-600" />
          </div>

          {/* Editable heading */}
          <div className="min-w-0 flex-1">
            <InlineCaption
              content={step.text_content || ''}
              onChange={onCaptionChange}
              placeholder="Titre de section..."
              isHeading
              readOnly={readOnly}
            />
          </div>

          {/* Delete (hidden in readOnly) */}
          {!readOnly && (
            <button
              type="button"
              onClick={onDelete}
              className={cn(
                'mt-2 text-slate-300 transition-all hover:text-red-500',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Regular step (with or without screenshot)
  return (
    <div
      ref={readOnly ? undefined : setNodeRef}
      style={readOnly ? undefined : style}
      className={cn(
        'group relative rounded-xl border border-slate-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        !readOnly && isDragging && 'z-50 opacity-50 shadow-lg'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header: badge + caption + actions */}
      <div className="flex items-start gap-3 p-4 pb-0">
        {/* Drag handle + badge */}
        <div className="flex items-center gap-2">
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'cursor-grab touch-none text-slate-300 transition-opacity hover:text-slate-400',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-violet-500 text-sm font-semibold text-white shadow-sm">
            {stepNumber}
          </div>
        </div>

        {/* Caption */}
        <div className="min-w-0 flex-1 pt-1">
          <InlineCaption
            content={step.text_content || ''}
            onChange={onCaptionChange}
            placeholder={
              hasScreenshot
                ? 'Cliquez sur "..."'
                : 'Décrivez cette étape...'
            }
            readOnly={readOnly}
          />
        </div>

        {/* Delete button (hidden in readOnly) */}
        {!readOnly && (
          <button
            type="button"
            onClick={onDelete}
            className={cn(
              'mt-1 text-slate-300 transition-all hover:text-red-500',
              isHovered ? 'opacity-100' : 'opacity-0'
            )}
          >
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Screenshot (if exists) */}
      {hasScreenshot ? (
        <div className="relative p-4 pt-3">
          {/* Remove image button (hidden in readOnly) */}
          {!readOnly && (
            <button
              type="button"
              onClick={onRemoveImage}
              className={cn(
                'absolute right-6 top-5 z-10 flex h-7 w-7 items-center justify-center rounded-md bg-red-500/90 text-white shadow-sm transition-all hover:bg-red-600',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
              title="Supprimer l'image"
            >
              <ImageOff className="h-4 w-4" />
            </button>
          )}
          <StepScreenshot
            src={step.signedScreenshotUrl!}
            alt={`Step ${stepNumber} screenshot`}
            annotations={annotations}
            onAnnotationsChange={onAnnotationsChange}
            onUpdateAnnotation={handleUpdateAnnotation}
            onDeleteAnnotation={handleDeleteAnnotation}
            readOnly={readOnly}
          />
        </div>
      ) : !readOnly ? (
        /* Text-only step - show option to add image (only in edit mode) */
        <div className="px-4 pb-4 pt-2">
          {showImagePicker ? (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-medium text-slate-600">Choisir une image</span>
                <button
                  type="button"
                  onClick={() => setShowImagePicker(false)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              {availableSources.length > 0 ? (
                <div className="grid grid-cols-4 gap-2">
                  {availableSources.map((source) => (
                    <button
                      key={source.id}
                      type="button"
                      onClick={() => {
                        onSetImage?.(source);
                        setShowImagePicker(false);
                      }}
                      className="group relative aspect-video overflow-hidden rounded-md border border-slate-200 bg-white transition-all hover:border-violet-400 hover:ring-2 hover:ring-violet-200"
                    >
                      <Image
                        src={source.signedScreenshotUrl!}
                        alt="Source thumbnail"
                        fill
                        className="object-cover"
                        sizes="100px"
                      />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">Aucune image disponible dans la timeline</p>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowImagePicker(true)}
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 py-3 text-sm text-slate-500 transition-colors hover:border-violet-400 hover:bg-violet-50 hover:text-violet-600"
            >
              <ImagePlus className="h-4 w-4" />
              <span>Ajouter une image</span>
            </button>
          )}
        </div>
      ) : (
        /* Text-only step in readOnly - just add padding */
        <div className="pb-4" />
      )}
    </div>
  );
}
