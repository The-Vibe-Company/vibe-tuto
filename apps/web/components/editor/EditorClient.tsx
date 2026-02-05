'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DocEditor, type NewStepType } from './DocEditor';
import { GenerateDialog } from './GenerateDialog';
import type { Tutorial, SourceWithSignedUrl, StepWithSignedUrl, Annotation } from '@/lib/types/editor';
import type { GeneratedTutorialContent } from '@/lib/types/generation';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorClientProps {
  initialTutorial: Tutorial;
  initialSources: SourceWithSignedUrl[];
  initialSteps: StepWithSignedUrl[];
  audioUrl: string | null;
}

export function EditorClient({
  initialTutorial,
  initialSources,
  initialSteps,
}: EditorClientProps) {
  const [tutorial, setTutorial] = useState(initialTutorial);
  const [sources] = useState(initialSources);
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingDescriptions, setPendingDescriptions] = useState<Record<string, string>>({});
  const [pendingAnnotations, setPendingAnnotations] = useState<Record<string, Annotation[]>>({});
  const [pendingUrls, setPendingUrls] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isReordering, setIsReordering] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // AI Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generateDialogOpen, setGenerateDialogOpen] = useState(false);

  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingDescriptions).length > 0 || Object.keys(pendingAnnotations).length > 0 || Object.keys(pendingUrls).length > 0;

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  // Handle tutorial title change
  const handleTitleChange = useCallback(async (newTitle: string) => {
    const previousTitle = tutorial.title;

    // Optimistic update
    setTutorial((prev) => ({ ...prev, title: newTitle }));

    try {
      const response = await fetch(`/api/tutorials/${tutorial.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });

      if (!response.ok) {
        throw new Error('Failed to update title');
      }
    } catch (error) {
      console.error('Failed to update title:', error);
      // Rollback on error
      setTutorial((prev) => ({ ...prev, title: previousTitle }));
    }
  }, [tutorial.id, tutorial.title]);

  // Handle caption change for any step
  const handleStepCaptionChange = useCallback((stepId: string, caption: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, text_content: caption } : step
      )
    );

    setPendingChanges((prev) => ({
      ...prev,
      [stepId]: caption,
    }));

    setSaveStatus('unsaved');
  }, []);

  // Handle description change for any step
  const handleStepDescriptionChange = useCallback((stepId: string, description: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, description } : step
      )
    );

    setPendingDescriptions((prev) => ({
      ...prev,
      [stepId]: description,
    }));

    setSaveStatus('unsaved');
  }, []);

  // Handle annotations change for any step
  const handleStepAnnotationsChange = useCallback((stepId: string, annotations: Annotation[]) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, annotations } : step
      )
    );

    setPendingAnnotations((prev) => ({
      ...prev,
      [stepId]: annotations,
    }));

    setSaveStatus('unsaved');
  }, []);

  // Handle URL change for any step
  const handleStepUrlChange = useCallback((stepId: string, url: string) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, url } : step
      )
    );

    setPendingUrls((prev) => ({
      ...prev,
      [stepId]: url,
    }));

    setSaveStatus('unsaved');
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const stepIdsToSave = new Set([
        ...Object.keys(pendingChanges),
        ...Object.keys(pendingDescriptions),
        ...Object.keys(pendingAnnotations),
        ...Object.keys(pendingUrls),
      ]);

      const savePromises = Array.from(stepIdsToSave).map(async (stepId) => {
        const payload: { text_content?: string; description?: string; annotations?: Annotation[]; url?: string } = {};

        if (pendingChanges[stepId] !== undefined) {
          payload.text_content = pendingChanges[stepId];
        }

        if (pendingDescriptions[stepId] !== undefined) {
          payload.description = pendingDescriptions[stepId];
        }

        if (pendingAnnotations[stepId] !== undefined) {
          payload.annotations = pendingAnnotations[stepId];
        }

        if (pendingUrls[stepId] !== undefined) {
          payload.url = pendingUrls[stepId];
        }

        const response = await fetch(`/api/steps/${stepId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Failed to save');
        }

        return response.json();
      });

      await Promise.all(savePromises);

      setPendingChanges({});
      setPendingDescriptions({});
      setPendingAnnotations({});
      setPendingUrls({});
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingDescriptions, pendingAnnotations, pendingUrls, hasChanges]);

  // Handle step reordering via drag & drop
  const handleReorderSteps = useCallback(async (newSteps: StepWithSignedUrl[]) => {
    const previousSteps = steps;

    setSteps(newSteps);
    setIsReordering(true);

    try {
      const response = await fetch(`/api/tutorials/${initialTutorial.id}/steps/reorder`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stepIds: newSteps.map((s) => s.id) }),
      });

      if (!response.ok) {
        throw new Error('Failed to reorder steps');
      }
    } catch (error) {
      console.error('Failed to reorder steps:', error);
      setSteps(previousSteps);
    } finally {
      setIsReordering(false);
    }
  }, [steps, initialTutorial.id]);

  // Handle step deletion
  const handleDeleteStep = useCallback(async (stepId: string) => {
    const previousSteps = steps;
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    const newSteps = steps.filter((s) => s.id !== stepId);
    setSteps(newSteps);

    if (selectedStepId === stepId) {
      const newSelectedIndex = Math.min(stepIndex, newSteps.length - 1);
      setSelectedStepId(newSteps[newSelectedIndex]?.id ?? null);
    }

    setPendingChanges((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    setPendingDescriptions((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    setPendingAnnotations((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    setPendingUrls((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete step');
      }
    } catch (error) {
      console.error('Failed to delete step:', error);
      setSteps(previousSteps);
      setSelectedStepId(stepId);
    }
  }, [steps, selectedStepId]);

  // Handle adding a new step (text, heading, divider)
  const handleAddStep = useCallback(async (type: NewStepType, afterStepId?: string | null) => {
    const tempId = `temp-${Date.now()}`;

    let afterIndex = -1;
    let previousSteps: StepWithSignedUrl[] = [];

    setSteps((currentSteps) => {
      previousSteps = currentSteps;
      // null = insert at beginning, undefined = insert at end, string = insert after specific step
      afterIndex = afterStepId === null ? -1 : afterStepId ? currentSteps.findIndex((s) => s.id === afterStepId) : currentSteps.length - 1;

      const newStep: StepWithSignedUrl = {
        id: tempId,
        tutorial_id: initialTutorial.id,
        source_id: null,
        order_index: afterIndex + 1,
        text_content: type === 'heading' ? '<strong>New section</strong>' : type === 'divider' ? '' : 'New text step',
        description: null,
        step_type: type,
        annotations: null,
        created_at: new Date().toISOString(),
        signedScreenshotUrl: null,
        source: null,
        click_x: null,
        click_y: null,
        viewport_width: null,
        viewport_height: null,
        element_info: null,
      };

      const newSteps = [...currentSteps];
      newSteps.splice(afterIndex + 1, 0, newStep);
      return newSteps;
    });

    setSelectedStepId(tempId);

    try {
      const response = await fetch(`/api/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorial_id: initialTutorial.id,
          order_index: afterIndex + 1,
          step_type: type,
          text_content: type === 'heading' ? '<strong>New section</strong>' : type === 'divider' ? '' : 'New text step',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create step');
      }

      const data = await response.json();

      setSteps((prev) =>
        prev.map((s) =>
          s.id === tempId ? { ...s, id: data.step.id } : s
        )
      );
      setSelectedStepId(data.step.id);
    } catch (error) {
      console.error('Failed to add step:', error);
      setSteps(previousSteps);
      setSelectedStepId(previousSteps[0]?.id ?? null);
    }
  }, [initialTutorial.id]);

  // Handle creating a step from a source (screenshot)
  const handleCreateStepFromSource = useCallback(async (source: SourceWithSignedUrl) => {
    const tempId = `temp-${Date.now()}`;

    let previousSteps: StepWithSignedUrl[] = [];

    setSteps((currentSteps) => {
      previousSteps = currentSteps;

      const newStep: StepWithSignedUrl = {
        id: tempId,
        tutorial_id: initialTutorial.id,
        source_id: source.id,
        order_index: currentSteps.length,
        text_content: null, // Will be auto-generated by API
        description: null,
        step_type: 'image',
        annotations: null, // Will be auto-generated by API (click-indicator)
        created_at: new Date().toISOString(),
        signedScreenshotUrl: source.signedScreenshotUrl,
        source: source,
        click_x: source.click_x,
        click_y: source.click_y,
        viewport_width: source.viewport_width,
        viewport_height: source.viewport_height,
        element_info: source.element_info,
      };

      return [...currentSteps, newStep];
    });

    setSelectedStepId(tempId);

    try {
      const response = await fetch(`/api/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorial_id: initialTutorial.id,
          source_id: source.id,
          step_type: 'image',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.details || 'Failed to create step');
      }

      const data = await response.json();

      // Update the step with the real data from API
      setSteps((prev) =>
        prev.map((s) =>
          s.id === tempId
            ? {
                ...s,
                id: data.step.id,
                text_content: data.step.text_content,
                annotations: data.step.annotations,
              }
            : s
        )
      );
      setSelectedStepId(data.step.id);
    } catch (error) {
      console.error('Failed to create step from source:', error);
      setSteps(previousSteps);
      setSelectedStepId(previousSteps[previousSteps.length - 1]?.id ?? null);
    }
  }, [initialTutorial.id]);

  // Handle removing the image from a step
  const handleRemoveStepImage = useCallback(async (stepId: string) => {
    const previousSteps = steps;

    // Optimistic update
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              source_id: null,
              signedScreenshotUrl: null,
              source: null,
              click_x: null,
              click_y: null,
              viewport_width: null,
              viewport_height: null,
              annotations: null,
            }
          : s
      )
    );

    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: null }),
      });

      if (!response.ok) {
        throw new Error('Failed to remove image');
      }
    } catch (error) {
      console.error('Failed to remove step image:', error);
      setSteps(previousSteps);
    }
  }, [steps]);

  // Handle setting/changing the image of a step
  const handleSetStepImage = useCallback(async (stepId: string, source: SourceWithSignedUrl) => {
    const previousSteps = steps;

    // Generate click indicator annotation if source has coordinates
    const generatedAnnotations = source.click_x != null && source.click_y != null &&
                source.viewport_width && source.viewport_height
      ? [{
          id: crypto.randomUUID(),
          type: 'click-indicator' as const,
          x: source.click_x / source.viewport_width,
          y: source.click_y / source.viewport_height,
          color: '#8b5cf6',
        }]
      : null;

    // Optimistic update
    setSteps((prev) =>
      prev.map((s) =>
        s.id === stepId
          ? {
              ...s,
              source_id: source.id,
              signedScreenshotUrl: source.signedScreenshotUrl,
              source: source,
              click_x: source.click_x,
              click_y: source.click_y,
              viewport_width: source.viewport_width,
              viewport_height: source.viewport_height,
              element_info: source.element_info,
              annotations: generatedAnnotations,
            }
          : s
      )
    );

    try {
      const response = await fetch(`/api/steps/${stepId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_id: source.id, annotations: generatedAnnotations }),
      });

      if (!response.ok) {
        throw new Error('Failed to set image');
      }
    } catch (error) {
      console.error('Failed to set step image:', error);
      setSteps(previousSteps);
    }
  }, [steps]);

  // Handle opening the generate dialog
  const handleGenerateClick = useCallback(() => {
    setGenerateDialogOpen(true);
  }, []);

  // Handle applying generated content
  const handleApplyGenerated = useCallback(async (generated: GeneratedTutorialContent) => {
    setIsGenerating(true);

    try {
      // Update title if different
      if (generated.title && generated.title !== tutorial.title) {
        await handleTitleChange(generated.title);
      }

      // Update description if different
      if (generated.description && generated.description !== tutorial.description) {
        const response = await fetch(`/api/tutorials/${tutorial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: generated.description }),
        });

        if (response.ok) {
          setTutorial((prev) => ({ ...prev, description: generated.description }));
        }
      }

      // Build updates for existing steps and identify sources needing new steps
      const stepUpdates: { id: string; text_content: string; description?: string }[] = [];
      const sourcesToCreate: { sourceId: string; textContent: string; description?: string }[] = [];

      for (const genStep of generated.steps) {
        // Find existing step with this source_id
        const existingStep = steps.find((s) => s.source_id === genStep.sourceId);

        if (existingStep) {
          // Update existing step
          stepUpdates.push({
            id: existingStep.id,
            text_content: genStep.textContent,
            description: genStep.description,
          });
        } else {
          // Need to create a new step from this source
          sourcesToCreate.push({
            sourceId: genStep.sourceId,
            textContent: genStep.textContent,
            description: genStep.description,
          });
        }
      }

      // Update existing steps via batch API
      if (stepUpdates.length > 0) {
        const response = await fetch('/api/steps/batch', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tutorialId: tutorial.id,
            updates: stepUpdates,
          }),
        });

        if (response.ok) {
          setSteps((prev) =>
            prev.map((step) => {
              const update = stepUpdates.find((u) => u.id === step.id);
              if (update) {
                return { ...step, text_content: update.text_content, description: update.description || null };
              }
              return step;
            })
          );
        }
      }

      // Create new steps from sources
      for (const toCreate of sourcesToCreate) {
        const source = sources.find((s) => s.id === toCreate.sourceId);
        if (source) {
          // Create step via API
          const response = await fetch('/api/steps', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tutorial_id: tutorial.id,
              source_id: source.id,
              step_type: 'image',
              text_content: toCreate.textContent,
              description: toCreate.description,
            }),
          });

          if (response.ok) {
            const data = await response.json();

            // Add the new step to local state
            setSteps((prev) => [
              ...prev,
              {
                id: data.step.id,
                tutorial_id: tutorial.id,
                source_id: source.id,
                order_index: prev.length,
                text_content: toCreate.textContent,
                description: toCreate.description || null,
                step_type: 'image' as const,
                annotations: data.step.annotations,
                created_at: data.step.created_at,
                signedScreenshotUrl: source.signedScreenshotUrl,
                source: source,
                click_x: source.click_x,
                click_y: source.click_y,
                viewport_width: source.viewport_width,
                viewport_height: source.viewport_height,
                element_info: source.element_info,
                url: source.url,
              },
            ]);
          }
        }
      }

      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to apply generated content:', error);
      setSaveStatus('error');
      throw error; // Re-throw to let the dialog handle the error
    } finally {
      setIsGenerating(false);
    }
  }, [tutorial, steps, sources, handleTitleChange]);

  // Auto-save with debounce (1 second delay)
  useEffect(() => {
    if (!hasChanges) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingChanges, pendingDescriptions, pendingAnnotations, pendingUrls, hasChanges, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave]);

  return (
    <>
      <DocEditor
        tutorial={tutorial}
        sources={sources}
        steps={steps}
        saveStatus={isSaving || isReordering ? 'saving' : saveStatus}
        onTitleChange={handleTitleChange}
        onStepCaptionChange={handleStepCaptionChange}
        onStepDescriptionChange={handleStepDescriptionChange}
        onStepAnnotationsChange={handleStepAnnotationsChange}
        onStepUrlChange={handleStepUrlChange}
        onDeleteStep={handleDeleteStep}
        onReorderSteps={handleReorderSteps}
        onAddStep={handleAddStep}
        onCreateStepFromSource={handleCreateStepFromSource}
        onRemoveStepImage={handleRemoveStepImage}
        onSetStepImage={handleSetStepImage}
        onGenerateClick={handleGenerateClick}
        isGenerating={isGenerating}
      />

      <GenerateDialog
        open={generateDialogOpen}
        onOpenChange={setGenerateDialogOpen}
        tutorialId={tutorial.id}
        currentTitle={tutorial.title}
        currentDescription={tutorial.description}
        sources={sources}
        steps={steps}
        onApply={handleApplyGenerated}
      />
    </>
  );
}
