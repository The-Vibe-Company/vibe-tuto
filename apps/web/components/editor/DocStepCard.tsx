'use client';

import { useState, useCallback } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Heading, Minus, ImageOff, ImagePlus, ExternalLink, Pencil, Check, X } from 'lucide-react';
import type { StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import { formatSourceUrl, getSourceActionType } from '@/lib/types/editor';
import { InlineCaption } from './InlineCaption';
import { StepScreenshot } from './StepScreenshot';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

interface DocStepCardProps {
  step: StepWithSignedUrl;
  stepNumber: number;
  sources?: SourceWithSignedUrl[];
  onCaptionChange?: (caption: string) => void;
  onUrlChange?: (url: string) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onDelete?: () => void;
  onRemoveImage?: () => void;
  onSetImage?: (source: SourceWithSignedUrl) => void;
  readOnly?: boolean;
}

import { memo } from 'react';

function DocStepCardComponent({
  step,
  stepNumber,
  sources = [],
  onCaptionChange,
  onUrlChange,
  onAnnotationsChange,
  onDelete,
  onRemoveImage,
  onSetImage,
  readOnly = false,
}: DocStepCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  // Compute URL with fallback to source URL for existing steps
  const displayUrl = step.url || step.source?.url || null;
  // Detect if this is a tab_change step for visual differentiation
  const isTabChange = step.source ? getSourceActionType(step.source) === 'tab_change' : false;
  const [editedUrl, setEditedUrl] = useState(displayUrl || '');
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
                'cursor-grab touch-none text-muted-foreground/50 transition-all hover:text-muted-foreground',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Divider line */}
          <div className="flex flex-1 items-center gap-3">
            <Separator className="flex-1" />
            <Minus className="h-4 w-4 text-muted-foreground/30" />
            <Separator className="flex-1" />
          </div>

          {/* Delete (hidden in readOnly) */}
          {!readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Supprimer le séparateur
              </TooltipContent>
            </Tooltip>
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
          'group relative py-3',
          !readOnly && isDragging && 'z-50 opacity-50'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex items-start gap-3">
          {/* Drag handle (hidden in readOnly) */}
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'mt-1.5 cursor-grab touch-none text-muted-foreground/50 transition-all hover:text-muted-foreground',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-5 w-5" />
            </button>
          )}

          {/* Icon */}
          <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-md bg-primary/10">
            <Heading className="h-4 w-4 text-primary" />
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
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className={cn(
                    'h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Supprimer le titre
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  // Regular step (with or without screenshot)
  return (
    <>
      <Card
        ref={readOnly ? undefined : setNodeRef}
        style={readOnly ? undefined : style}
        className={cn(
          'group relative transition-all duration-200',
          !readOnly && isDragging && 'z-50 opacity-50 shadow-lg ring-2 ring-primary/20',
          !isDragging && 'hover:shadow-md hover:border-border/80'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-0">
          {/* Header: badge + caption + actions */}
          <div className="flex items-start gap-3 p-4 pb-0">
            {/* Drag handle + badge */}
            <div className="flex items-center gap-2">
              {!readOnly && (
                <button
                  {...attributes}
                  {...listeners}
                  className={cn(
                    'cursor-grab touch-none text-muted-foreground/50 transition-all hover:text-muted-foreground',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <GripVertical className="h-5 w-5" />
                </button>
              )}

              <div className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-sm",
                isTabChange
                  ? "bg-amber-500 text-white"
                  : "bg-primary text-primary-foreground"
              )}>
                {stepNumber}
              </div>
            </div>

            {/* Caption */}
            <div className="min-w-0 flex-1 pt-0.5">
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

            {/* Action buttons (hidden in readOnly) */}
            {!readOnly && (
              <div className={cn(
                'flex items-center gap-1 transition-all',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}>
                {hasScreenshot && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemoveImage}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <ImageOff className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Retirer l&apos;image
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Supprimer l&apos;étape
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* URL for navigation/tab_change steps */}
          {displayUrl && (
            <div className="px-4 pt-2">
              {isEditingUrl && !readOnly ? (
                <div className="flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <input
                    type="url"
                    value={editedUrl}
                    onChange={(e) => setEditedUrl(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        onUrlChange?.(editedUrl);
                        setIsEditingUrl(false);
                      } else if (e.key === 'Escape') {
                        setEditedUrl(displayUrl || '');
                        setIsEditingUrl(false);
                      }
                    }}
                    className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      onUrlChange?.(editedUrl);
                      setIsEditingUrl(false);
                    }}
                    className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50"
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setEditedUrl(displayUrl || '');
                      setIsEditingUrl(false);
                    }}
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="group/url flex items-center gap-2">
                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <a
                    href={displayUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-muted-foreground hover:text-primary hover:underline truncate"
                  >
                    {formatSourceUrl(displayUrl)}
                  </a>
                  {!readOnly && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditedUrl(displayUrl || '');
                        setIsEditingUrl(true);
                      }}
                      className="h-6 w-6 opacity-0 group-hover/url:opacity-100 text-muted-foreground hover:text-primary transition-opacity"
                    >
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Screenshot (if exists) */}
          {hasScreenshot ? (
            <div className="p-4 pt-3">
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
              <Button
                variant="outline"
                onClick={() => setShowImagePicker(true)}
                className="w-full border-dashed hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                <span>Ajouter une image</span>
              </Button>
            </div>
          ) : (
            /* Text-only step in readOnly - just add padding */
            <div className="pb-4" />
          )}
        </CardContent>
      </Card>

      {/* Image picker dialog */}
      <Dialog open={showImagePicker} onOpenChange={setShowImagePicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choisir une image</DialogTitle>
            <DialogDescription>
              Sélectionnez une capture d&apos;écran depuis la timeline
            </DialogDescription>
          </DialogHeader>
          {availableSources.length > 0 ? (
            <ScrollArea className="max-h-[400px]">
              <div className="grid grid-cols-3 gap-3 p-1">
                {availableSources.map((source) => (
                  <button
                    key={source.id}
                    type="button"
                    onClick={() => {
                      onSetImage?.(source);
                      setShowImagePicker(false);
                    }}
                    className="group relative aspect-video overflow-hidden rounded-lg border border-border bg-muted transition-all hover:border-primary hover:ring-2 hover:ring-primary/20"
                  >
                    <Image
                      src={source.signedScreenshotUrl!}
                      alt="Source thumbnail"
                      fill
                      className="object-cover transition-transform group-hover:scale-105"
                      sizes="150px"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="py-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aucune image disponible dans la timeline
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

// Memoize to prevent unnecessary re-renders when parent updates
export const DocStepCard = memo(DocStepCardComponent, (prev, next) => {
  // Custom comparison to only re-render when necessary
  return (
    prev.step.id === next.step.id &&
    prev.step.text_content === next.step.text_content &&
    prev.step.signedScreenshotUrl === next.step.signedScreenshotUrl &&
    prev.step.step_type === next.step.step_type &&
    prev.step.url === next.step.url &&
    prev.stepNumber === next.stepNumber &&
    prev.readOnly === next.readOnly &&
    JSON.stringify(prev.step.annotations) === JSON.stringify(next.step.annotations) &&
    (prev.sources?.length ?? 0) === (next.sources?.length ?? 0)
  );
});
