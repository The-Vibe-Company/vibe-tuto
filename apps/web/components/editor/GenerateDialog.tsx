'use client';

import { useState } from 'react';
import { Sparkles, Loader2, Check, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import type {
  GeneratedTutorialContent,
  GenerateTutorialResponse,
  GenerationStyle,
} from '@/lib/types/generation';
import type { SourceWithSignedUrl, StepWithSignedUrl } from '@/lib/types/editor';

type GenerateStatus = 'idle' | 'generating' | 'preview' | 'applying' | 'error';

interface GenerateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorialId: string;
  currentTitle: string;
  currentDescription: string | null;
  sources: SourceWithSignedUrl[];
  steps: StepWithSignedUrl[];
  onApply: (generated: GeneratedTutorialContent) => Promise<void>;
}

export function GenerateDialog({
  open,
  onOpenChange,
  tutorialId,
  currentTitle,
  currentDescription,
  sources,
  steps,
  onApply,
}: GenerateDialogProps) {
  const [status, setStatus] = useState<GenerateStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [generated, setGenerated] = useState<GeneratedTutorialContent | null>(null);
  const [editedContent, setEditedContent] = useState<GeneratedTutorialContent | null>(null);
  const [metadata, setMetadata] = useState<GenerateTutorialResponse['metadata'] | null>(null);
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set());

  // Generation options
  const [userGoal, setUserGoal] = useState('');
  const [style, setStyle] = useState<GenerationStyle>('normal');

  const handleGenerate = async () => {
    setStatus('generating');
    setError(null);

    try {
      const response = await fetch('/api/generate-tutorial', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorialId,
          options: {
            userGoal: userGoal.trim() || undefined,
            style,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setGenerated(data.generated);
      setEditedContent(data.generated);
      setMetadata(data.metadata);
      setStatus('preview');
    } catch (err) {
      console.error('Generation error:', err);
      setError(err instanceof Error ? err.message : 'Generation failed');
      setStatus('error');
    }
  };

  const handleApply = async () => {
    if (!editedContent) return;

    setStatus('applying');
    try {
      await onApply(editedContent);
      onOpenChange(false);
      // Reset state for next time
      setStatus('idle');
      setGenerated(null);
      setEditedContent(null);
      setMetadata(null);
      setUserGoal('');
      setStyle('normal');
    } catch (err) {
      console.error('Apply error:', err);
      setError(err instanceof Error ? err.message : 'Failed to apply changes');
      setStatus('error');
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset state after a delay to prevent flash
    setTimeout(() => {
      setStatus('idle');
      setGenerated(null);
      setEditedContent(null);
      setMetadata(null);
      setError(null);
      setExpandedSteps(new Set());
      setUserGoal('');
      setStyle('normal');
    }, 200);
  };

  const toggleStepExpanded = (index: number) => {
    setExpandedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const updateStepText = (index: number, text: string) => {
    if (!editedContent) return;
    setEditedContent({
      ...editedContent,
      steps: editedContent.steps.map((step, i) =>
        i === index ? { ...step, textContent: text } : step
      ),
    });
  };

  const updateStepDescription = (index: number, description: string) => {
    if (!editedContent) return;
    setEditedContent({
      ...editedContent,
      steps: editedContent.steps.map((step, i) =>
        i === index ? { ...step, description: description || undefined } : step
      ),
    });
  };

  // Find the source for a step to show its thumbnail
  const getSourceForStep = (sourceId: string) => {
    return sources.find((s) => s.id === sourceId);
  };

  // Find current step text for comparison
  const getCurrentStepText = (sourceId: string) => {
    const step = steps.find((s) => s.source_id === sourceId);
    return step?.text_content || '';
  };

  // Find current step description for comparison
  const getCurrentStepDescription = (sourceId: string) => {
    const step = steps.find((s) => s.source_id === sourceId);
    return step?.description || '';
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-violet-500" />
            Generate with AI
          </DialogTitle>
          <DialogDescription>
            {status === 'idle' && 'Configure options and generate tutorial content from your screenshots and audio.'}
            {status === 'generating' && 'Analyzing your tutorial...'}
            {status === 'preview' && 'Review and edit the generated content before applying.'}
            {status === 'applying' && 'Applying changes...'}
            {status === 'error' && 'An error occurred during generation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {/* Idle State - Show options and generate button */}
          {status === 'idle' && (
            <div className="space-y-6 py-4">
              {/* User Goal */}
              <div className="space-y-2">
                <Label htmlFor="user-goal">What should this tutorial teach? (optional)</Label>
                <Textarea
                  id="user-goal"
                  placeholder="Example: How to create a new project and configure team settings..."
                  value={userGoal}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setUserGoal(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground">
                  Describe the goal to help AI generate more focused content.
                </p>
              </div>

              {/* Writing Style */}
              <div className="space-y-3">
                <Label>Writing style</Label>
                <RadioGroup
                  value={style}
                  onValueChange={(v) => setStyle(v as GenerationStyle)}
                  className="space-y-2"
                >
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="concise" id="concise" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <Label htmlFor="concise" className="font-medium cursor-pointer">
                        Concise
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Short, action-focused instructions only. No detailed explanations.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors border-violet-200 bg-violet-50/30">
                    <RadioGroupItem value="normal" id="normal" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <Label htmlFor="normal" className="font-medium cursor-pointer">
                        Normal (Recommended)
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Clear instructions with brief context. Good balance.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3 rounded-lg border p-3 hover:bg-muted/50 transition-colors">
                    <RadioGroupItem value="detailed" id="detailed" className="mt-0.5" />
                    <div className="space-y-0.5">
                      <Label htmlFor="detailed" className="font-medium cursor-pointer">
                        Detailed
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        Comprehensive instructions with explanations of WHY each step matters.
                      </p>
                    </div>
                  </div>
                </RadioGroup>
              </div>

              {/* Generate Button */}
              <div className="flex flex-col items-center pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  AI will analyze {sources.length} screenshot{sources.length !== 1 ? 's' : ''} and any audio transcription.
                </p>
                <Button onClick={handleGenerate} size="lg" className="gap-2">
                  <Sparkles className="h-4 w-4" />
                  Generate Tutorial
                </Button>
              </div>
            </div>
          )}

          {/* Generating State - Show loading */}
          {status === 'generating' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-violet-500 mb-4" />
              <p className="text-sm text-stone-500">Analyzing screenshots and generating content...</p>
              <p className="text-xs text-stone-400 mt-2">This may take 10-30 seconds</p>
            </div>
          )}

          {/* Error State */}
          {status === 'error' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="rounded-full bg-red-100 p-4 mb-4">
                <AlertCircle className="h-8 w-8 text-red-500" />
              </div>
              <h3 className="text-lg font-medium mb-2">Generation failed</h3>
              <p className="text-sm text-red-600 mb-6">{error}</p>
              <Button onClick={handleGenerate} variant="outline" className="gap-2">
                Try again
              </Button>
            </div>
          )}

          {/* Preview State - Show generated content */}
          {status === 'preview' && editedContent && (
            <ScrollArea className="h-[50vh] pr-4">
              <div className="space-y-6">
                {/* Title */}
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    value={editedContent.title}
                    onChange={(e) => setEditedContent({ ...editedContent, title: e.target.value })}
                    className={cn(
                      editedContent.title !== currentTitle && 'border-violet-300 bg-violet-50'
                    )}
                  />
                  {editedContent.title !== currentTitle && (
                    <p className="text-xs text-stone-500">
                      Current: &quot;{currentTitle}&quot;
                    </p>
                  )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={editedContent.description}
                    onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedContent({ ...editedContent, description: e.target.value })}
                    rows={2}
                    className={cn(
                      editedContent.description !== (currentDescription || '') && 'border-violet-300 bg-violet-50'
                    )}
                  />
                  {currentDescription && editedContent.description !== currentDescription && (
                    <p className="text-xs text-stone-500">
                      Current: &quot;{currentDescription.substring(0, 100)}...&quot;
                    </p>
                  )}
                </div>

                {/* Steps */}
                <div className="space-y-2">
                  <Label>Steps ({editedContent.steps.length})</Label>
                  <div className="space-y-2">
                    {editedContent.steps.map((step, index) => {
                      const source = getSourceForStep(step.sourceId);
                      const currentText = getCurrentStepText(step.sourceId);
                      const currentDesc = getCurrentStepDescription(step.sourceId);
                      const isExpanded = expandedSteps.has(index);
                      const hasTextChanged = step.textContent !== currentText;
                      const hasDescChanged = (step.description || '') !== currentDesc;
                      const hasChanged = hasTextChanged || hasDescChanged;

                      return (
                        <div
                          key={step.sourceId}
                          className={cn(
                            'rounded-lg border p-3 transition-colors',
                            hasChanged ? 'border-violet-300 bg-violet-50/50' : 'border-stone-200'
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => toggleStepExpanded(index)}
                            className="flex w-full items-center gap-3 text-left"
                          >
                            {/* Thumbnail */}
                            {source?.signedScreenshotUrl && (
                              <img
                                src={source.signedScreenshotUrl}
                                alt={`Step ${index + 1}`}
                                className="h-12 w-16 rounded border border-stone-200 object-cover"
                              />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-medium text-stone-500">
                                  Step {index + 1}
                                </span>
                                {hasChanged && (
                                  <span className="text-xs text-violet-600 font-medium">
                                    Modified
                                  </span>
                                )}
                                {step.description && (
                                  <span className="text-xs text-blue-600">
                                    + description
                                  </span>
                                )}
                              </div>
                              <p className="text-sm truncate">
                                {step.textContent || 'No content'}
                              </p>
                            </div>
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4 text-stone-400" />
                            ) : (
                              <ChevronDown className="h-4 w-4 text-stone-400" />
                            )}
                          </button>

                          {isExpanded && (
                            <div className="mt-3 space-y-3">
                              {/* Instruction text */}
                              <div className="space-y-1">
                                <Label className="text-xs">Instruction</Label>
                                <Textarea
                                  value={step.textContent}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStepText(index, e.target.value)}
                                  rows={2}
                                  className="text-sm"
                                  placeholder="Short instruction..."
                                />
                                {currentText && currentText !== step.textContent && (
                                  <div className="text-xs text-stone-500">
                                    <span className="font-medium">Current:</span>{' '}
                                    &quot;{currentText.substring(0, 100)}{currentText.length > 100 ? '...' : ''}&quot;
                                  </div>
                                )}
                              </div>

                              {/* Description (detailed explanation) */}
                              <div className="space-y-1">
                                <Label className="text-xs">Detailed explanation (optional)</Label>
                                <Textarea
                                  value={step.description || ''}
                                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => updateStepDescription(index, e.target.value)}
                                  rows={3}
                                  className="text-sm text-muted-foreground"
                                  placeholder="Add detailed explanation of why this step matters..."
                                />
                                {currentDesc && currentDesc !== (step.description || '') && (
                                  <div className="text-xs text-stone-500">
                                    <span className="font-medium">Current:</span>{' '}
                                    &quot;{currentDesc.substring(0, 100)}{currentDesc.length > 100 ? '...' : ''}&quot;
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Metadata */}
                {metadata && (
                  <div className="rounded-lg bg-stone-50 p-3 text-xs text-stone-500">
                    <div className="flex items-center gap-4">
                      <span>Model: {metadata.modelUsed}</span>
                      <span>Tokens: {metadata.inputTokens + metadata.outputTokens}</span>
                      <span>Time: {(metadata.processingTimeMs / 1000).toFixed(1)}s</span>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}

          {/* Applying State */}
          {status === 'applying' && (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-violet-500 mb-4" />
              <p className="text-sm text-stone-500">Applying changes...</p>
            </div>
          )}
        </div>

        {/* Footer with actions */}
        {status === 'preview' && (
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={handleClose}>
              Cancel
            </Button>
            <Button onClick={handleApply} className="gap-2">
              <Check className="h-4 w-4" />
              Apply Changes
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
