'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DocEditor, type NewStepType } from './DocEditor';
import type { Tutorial, SourceWithSignedUrl, StepWithSignedUrl, Annotation } from '@/lib/types/editor';

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
  const [sources] = useState(initialSources);
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingAnnotations, setPendingAnnotations] = useState<Record<string, Annotation[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isReordering, setIsReordering] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingAnnotations).length > 0;

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

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

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      const stepIdsToSave = new Set([
        ...Object.keys(pendingChanges),
        ...Object.keys(pendingAnnotations),
      ]);

      const savePromises = Array.from(stepIdsToSave).map(async (stepId) => {
        const payload: { text_content?: string; annotations?: Annotation[] } = {};

        if (pendingChanges[stepId] !== undefined) {
          payload.text_content = pendingChanges[stepId];
        }

        if (pendingAnnotations[stepId] !== undefined) {
          payload.annotations = pendingAnnotations[stepId];
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
      setPendingAnnotations({});
      setSaveStatus('saved');
    } catch (error) {
      console.error('Failed to save:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, pendingAnnotations, hasChanges]);

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

    setPendingAnnotations((prev) => {
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
        text_content: type === 'heading' ? '<strong>Nouvelle section</strong>' : type === 'divider' ? '' : 'Nouvelle étape texte',
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
          text_content: type === 'heading' ? '<strong>Nouvelle section</strong>' : type === 'divider' ? '' : 'Nouvelle étape texte',
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
  }, [pendingChanges, pendingAnnotations, hasChanges, handleSave]);

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
    <DocEditor
      tutorial={initialTutorial}
      sources={sources}
      steps={steps}
      saveStatus={isSaving || isReordering ? 'saving' : saveStatus}
      selectedStepId={selectedStepId}
      onSelectStep={handleSelectStep}
      onStepCaptionChange={handleStepCaptionChange}
      onStepAnnotationsChange={handleStepAnnotationsChange}
      onDeleteStep={handleDeleteStep}
      onReorderSteps={handleReorderSteps}
      onAddStep={handleAddStep}
      onCreateStepFromSource={handleCreateStepFromSource}
      onRemoveStepImage={handleRemoveStepImage}
      onSetStepImage={handleSetStepImage}
    />
  );
}
