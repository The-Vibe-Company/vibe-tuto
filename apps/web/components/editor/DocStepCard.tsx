'use client';

import { useState, useCallback, memo } from 'react';
import Image from 'next/image';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, ImageOff, ImagePlus, ExternalLink, Pencil, Check, X, FileText, Globe, ArrowRightLeft, Monitor, ChevronRight, Eye, EyeOff } from 'lucide-react';
import type { StepWithSignedUrl, SourceWithSignedUrl, Annotation } from '@/lib/types/editor';
import { formatSourceUrl, getSourceActionType } from '@/lib/types/editor';
import { InlineCaption } from './InlineCaption';
import { StepScreenshot } from './StepScreenshot';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  previousStepUrl?: string | null;
  onCaptionChange?: (caption: string) => void;
  onDescriptionChange?: (description: string) => void;
  onUrlChange?: (url: string) => void;
  onShowUrlChange?: (showUrl: boolean) => void;
  onAnnotationsChange?: (annotations: Annotation[]) => void;
  onDelete?: () => void;
  onRemoveImage?: () => void;
  onSetImage?: (source: SourceWithSignedUrl) => void;
  readOnly?: boolean;
}

function DocStepCardComponent({
  step,
  stepNumber,
  sources = [],
  previousStepUrl,
  onCaptionChange,
  onDescriptionChange,
  onUrlChange,
  onShowUrlChange,
  onAnnotationsChange,
  onDelete,
  onRemoveImage,
  onSetImage,
  readOnly = false,
}: DocStepCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [isEditingUrl, setIsEditingUrl] = useState(false);
  const displayUrl = step.url || step.source?.url || null;
  const isTabChange = step.source ? getSourceActionType(step.source) === 'tab_change' : false;
  const [editedUrl, setEditedUrl] = useState(displayUrl || '');
  const annotations = step.annotations || [];

  // URL is redundant if it matches the previous step's URL
  const isUrlRedundant = displayUrl != null && previousStepUrl != null && displayUrl === previousStepUrl;
  const [urlExpanded, setUrlExpanded] = useState(false);

  const availableSources = sources.filter((s) => s.signedScreenshotUrl);

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

  // Divider step - gradient line
  if (isDivider) {
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
        <div className="flex items-center gap-3">
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'cursor-grab touch-none text-muted-foreground/40 transition-all hover:text-muted-foreground',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-border to-transparent" />

          {!readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className={cn(
                    'h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Delete divider
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  // Heading step - bold with left accent border
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
        <div className="flex items-start gap-3">
          {!readOnly && (
            <button
              {...attributes}
              {...listeners}
              className={cn(
                'mt-2 cursor-grab touch-none text-muted-foreground/40 transition-all hover:text-muted-foreground',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}

          <div className="min-w-0 flex-1 border-l-[3px] border-primary/60 pl-4 py-1">
            <InlineCaption
              content={step.text_content || ''}
              onChange={onCaptionChange}
              placeholder="Section title..."
              isHeading
              readOnly={readOnly}
            />
          </div>

          {!readOnly && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onDelete}
                  className={cn(
                    'mt-1 h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top" className="text-xs">
                Delete heading
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>
    );
  }

  // Regular step card
  return (
    <>
      <Card
        ref={readOnly ? undefined : setNodeRef}
        style={readOnly ? undefined : style}
        className={cn(
          'group relative rounded-xl border transition-all duration-200',
          !readOnly && isDragging && 'z-50 opacity-50 shadow-xl ring-2 ring-primary/20',
          !isDragging && 'hover:shadow-md hover:border-border/80'
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <CardContent className="p-0">
          <div className="flex items-start gap-4 p-4 pb-0">
            {/* Drag handle + step number */}
            <div className="flex flex-col items-center gap-1 pt-0.5">
              {!readOnly && (
                <button
                  {...attributes}
                  {...listeners}
                  className={cn(
                    'cursor-grab touch-none text-muted-foreground/40 transition-all hover:text-muted-foreground',
                    isHovered ? 'opacity-100' : 'opacity-0'
                  )}
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              )}

              <div
                className={cn(
                  'flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold shadow-sm',
                  isTabChange
                    ? 'bg-amber-500/15 text-amber-600 ring-1 ring-amber-500/30'
                    : 'bg-primary text-primary-foreground'
                )}
              >
                {stepNumber}
              </div>
            </div>

            {/* Content area */}
            <div className="min-w-0 flex-1 space-y-2">
              {/* Caption */}
              <div className="pt-1">
                <InlineCaption
                  content={step.text_content || ''}
                  onChange={onCaptionChange}
                  placeholder={
                    hasScreenshot
                      ? 'Click on "..."'
                      : 'Describe this step...'
                  }
                  readOnly={readOnly}
                />
              </div>

              {/* URL chip - hidden in read-only mode when redundant or show_url is false */}
              {displayUrl && !(readOnly && (isUrlRedundant || step.show_url === false)) && (
                <div className="pb-1">
                  {isUrlRedundant && !urlExpanded && !isEditingUrl ? (
                    <button
                      onClick={() => setUrlExpanded(true)}
                      className="inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/70 transition-colors"
                    >
                      <Globe className="h-2.5 w-2.5" />
                      <ChevronRight className="h-2.5 w-2.5" />
                    </button>
                  ) : isEditingUrl && !readOnly ? (
                    <div className="flex items-center gap-2">
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
                        <Check className="h-3.5 w-3.5" />
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
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="group/url flex items-center gap-1.5">
                      {isTabChange ? (
                        <Badge variant="outline" className="gap-1.5 font-normal text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-500/10 dark:border-amber-500/30">
                          <ArrowRightLeft className="h-3 w-3" />
                          <span className="text-xs">Tab switch</span>
                        </Badge>
                      ) : null}
                      <a
                        href={displayUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs transition-all duration-200 max-w-[300px]",
                          step.show_url === false
                            ? "bg-destructive/5 text-muted-foreground/30 line-through decoration-destructive/40"
                            : "bg-muted/70 text-muted-foreground hover:text-primary hover:bg-muted"
                        )}
                      >
                        <Globe className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{formatSourceUrl(displayUrl)}</span>
                        <ExternalLink className="h-2.5 w-2.5 flex-shrink-0 opacity-50" />
                      </a>
                      {step.show_url === false && !readOnly && (
                        <Badge variant="outline" className="gap-1 font-normal text-destructive/60 border-destructive/20 bg-destructive/5 text-[10px] px-1.5 py-0">
                          <EyeOff className="h-2.5 w-2.5" />
                          Hidden
                        </Badge>
                      )}
                      {isUrlRedundant && urlExpanded && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setUrlExpanded(false)}
                          className="h-6 w-6 text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                      {!readOnly && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => onShowUrlChange?.(step.show_url === false ? true : false)}
                              className={cn(
                                "h-6 w-6 transition-all",
                                step.show_url === false
                                  ? "text-destructive/60 hover:text-primary"
                                  : "opacity-0 group-hover/url:opacity-100 text-muted-foreground hover:text-primary"
                              )}
                            >
                              {step.show_url === false ? (
                                <EyeOff className="h-3 w-3" />
                              ) : (
                                <Eye className="h-3 w-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            {step.show_url === false ? 'Show URL publicly' : 'Hide URL publicly'}
                          </TooltipContent>
                        </Tooltip>
                      )}
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

              {/* App context badge for desktop sources */}
              {step.source?.app_name && (
                <div className="flex items-center gap-1.5 pb-1">
                  <Badge variant="outline" className="gap-1.5 font-normal text-muted-foreground border-border/60 bg-muted/30">
                    <Monitor className="h-3 w-3" />
                    <span className="text-xs">{step.source.app_name}</span>
                  </Badge>
                  {step.source.window_title && (
                    <span className="truncate text-xs text-muted-foreground/60 max-w-[200px]">
                      {step.source.window_title}
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action buttons */}
            {!readOnly && (
              <div
                className={cn(
                  'flex items-center gap-1 transition-all',
                  isHovered ? 'opacity-100' : 'opacity-0'
                )}
              >
                {hasScreenshot && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={onRemoveImage}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                      >
                        <ImageOff className="h-3.5 w-3.5" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      Remove image
                    </TooltipContent>
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={onDelete}
                      className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Delete step
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
          </div>

          {/* Screenshot */}
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
            <div className="px-4 pb-4 pt-2">
              <Button
                variant="outline"
                onClick={() => setShowImagePicker(true)}
                className="w-full border-dashed hover:border-primary hover:bg-primary/5 hover:text-primary transition-colors"
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                <span>Add an image</span>
              </Button>
            </div>
          ) : (
            <div className="pb-4" />
          )}

          {/* Description */}
          {step.description != null ? (
            <div className="px-4 pb-4">
              <div className="rounded-lg bg-muted/40 border border-border/50 p-3">
                <InlineCaption
                  content={step.description}
                  onChange={onDescriptionChange}
                  placeholder="Add details, context, or notes..."
                  readOnly={readOnly}
                />
              </div>
            </div>
          ) : !readOnly ? (
            <div className="px-4 pb-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDescriptionChange?.('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <FileText className="h-4 w-4 mr-2" />
                <span>Add description</span>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Image picker dialog */}
      <Dialog open={showImagePicker} onOpenChange={setShowImagePicker}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Choose an image</DialogTitle>
            <DialogDescription>
              Select a screenshot from the timeline
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
                No images available in the timeline
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export const DocStepCard = memo(DocStepCardComponent, (prev, next) => {
  return (
    prev.step.id === next.step.id &&
    prev.step.text_content === next.step.text_content &&
    prev.step.description === next.step.description &&
    prev.step.signedScreenshotUrl === next.step.signedScreenshotUrl &&
    prev.step.step_type === next.step.step_type &&
    prev.step.url === next.step.url &&
    prev.step.show_url === next.step.show_url &&
    prev.step.source?.app_name === next.step.source?.app_name &&
    prev.step.source?.window_title === next.step.source?.window_title &&
    prev.stepNumber === next.stepNumber &&
    prev.previousStepUrl === next.previousStepUrl &&
    prev.readOnly === next.readOnly &&
    JSON.stringify(prev.step.annotations) === JSON.stringify(next.step.annotations) &&
    (prev.sources?.length ?? 0) === (next.sources?.length ?? 0)
  );
});
