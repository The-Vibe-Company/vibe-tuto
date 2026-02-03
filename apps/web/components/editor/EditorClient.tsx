'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { FilmstripEditor, type NewStepType } from './FilmstripEditor';
import { PreviewOverlay } from './PreviewOverlay';
import type { Tutorial, StepWithSignedUrl, Annotation } from '@/lib/types/editor';

export type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error';

interface EditorClientProps {
  initialTutorial: Tutorial;
  initialSteps: StepWithSignedUrl[];
  audioUrl: string | null;
}

export function EditorClient({ initialTutorial, initialSteps }: EditorClientProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [pendingAnnotations, setPendingAnnotations] = useState<Record<string, Annotation[]>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [isReordering, setIsReordering] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewStepIndex, setPreviewStepIndex] = useState(0);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);
  const hasChanges = Object.keys(pendingChanges).length > 0 || Object.keys(pendingAnnotations).length > 0;

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  // Handle caption change for any step
  const handleStepCaptionChange = useCallback((stepId: string, caption: string) => {
    // Update local steps state for immediate UI feedback
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, text_content: caption } : step
      )
    );

    // Track pending changes
    setPendingChanges((prev) => ({
      ...prev,
      [stepId]: caption,
    }));

    // Mark as unsaved
    setSaveStatus('unsaved');
  }, []);

  // Handle annotations change for any step
  const handleStepAnnotationsChange = useCallback((stepId: string, annotations: Annotation[]) => {
    // Update local steps state for immediate UI feedback
    setSteps((prev) =>
      prev.map((step) =>
        step.id === stepId ? { ...step, annotations } : step
      )
    );

    // Track pending annotation changes
    setPendingAnnotations((prev) => ({
      ...prev,
      [stepId]: annotations,
    }));

    // Mark as unsaved
    setSaveStatus('unsaved');
  }, []);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);
    setSaveStatus('saving');

    try {
      // Combine all step IDs that need saving
      const stepIdsToSave = new Set([
        ...Object.keys(pendingChanges),
        ...Object.keys(pendingAnnotations),
      ]);

      // Save all pending changes
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

      // Clear pending changes on success
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

    // Optimistic update
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
      // Rollback on error
      setSteps(previousSteps);
    } finally {
      setIsReordering(false);
    }
  }, [steps, initialTutorial.id]);

  // Preview handlers
  const handleOpenPreview = useCallback(() => {
    // Start preview from the currently selected step
    const index = selectedStepIndex >= 0 ? selectedStepIndex : 0;
    setPreviewStepIndex(index);
    setIsPreviewOpen(true);
  }, [selectedStepIndex]);

  const handleClosePreview = useCallback(() => {
    setIsPreviewOpen(false);
  }, []);

  const handlePreviewStepChange = useCallback((index: number) => {
    setPreviewStepIndex(index);
  }, []);

  // Handle step deletion
  const handleDeleteStep = useCallback(async (stepId: string) => {
    const previousSteps = steps;
    const stepIndex = steps.findIndex((s) => s.id === stepId);

    // Optimistic update - remove step from list
    const newSteps = steps.filter((s) => s.id !== stepId);
    setSteps(newSteps);

    // Update selected step if deleted step was selected
    if (selectedStepId === stepId) {
      // Select the next step, or the previous one if we deleted the last step
      const newSelectedIndex = Math.min(stepIndex, newSteps.length - 1);
      setSelectedStepId(newSteps[newSelectedIndex]?.id ?? null);
    }

    // Remove any pending changes for this step
    setPendingChanges((prev) => {
      const { [stepId]: _, ...rest } = prev;
      return rest;
    });

    // Remove any pending annotations for this step
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
      // Rollback on error
      setSteps(previousSteps);
      setSelectedStepId(stepId);
    }
  }, [steps, selectedStepId]);

  // Handle adding a new step
  const handleAddStep = useCallback(async (type: NewStepType, afterStepId?: string) => {
    // Create optimistic step
    const tempId = `temp-${Date.now()}`;
    const afterIndex = afterStepId ? steps.findIndex((s) => s.id === afterStepId) : steps.length - 1;

    const newStep: StepWithSignedUrl = {
      id: tempId,
      tutorial_id: initialTutorial.id,
      order_index: afterIndex + 1,
      screenshot_url: null,
      signedScreenshotUrl: null,
      text_content: type === 'heading' ? '<strong>Nouvelle section</strong>' : type === 'divider' ? '' : 'Nouvelle étape texte',
      click_x: null,
      click_y: null,
      viewport_width: null,
      viewport_height: null,
      click_type: type,
      url: null,
      timestamp_start: null,
      timestamp_end: null,
      annotations: null,
      element_info: null,
      created_at: new Date().toISOString(),
    };

    // Insert after the specified step
    const newSteps = [...steps];
    newSteps.splice(afterIndex + 1, 0, newStep);
    setSteps(newSteps);
    setSelectedStepId(tempId);

    try {
      // Create the step in the database
      const response = await fetch(`/api/steps`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tutorial_id: initialTutorial.id,
          order_index: afterIndex + 1,
          click_type: type,
          text_content: newStep.text_content,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create step');
      }

      const data = await response.json();

      // Update the step with the real ID
      setSteps((prev) =>
        prev.map((s) =>
          s.id === tempId ? { ...s, id: data.step.id } : s
        )
      );
      setSelectedStepId(data.step.id);
    } catch (error) {
      console.error('Failed to add step:', error);
      // Rollback
      setSteps(steps);
    }
  }, [steps, initialTutorial.id]);

  // Auto-save with debounce (1 second delay)
  useEffect(() => {
    if (!hasChanges) return;

    // Clear any existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Set new timer for auto-save
    debounceTimerRef.current = setTimeout(() => {
      handleSave();
    }, 1000);

    // Cleanup on unmount or when dependencies change
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [pendingChanges, pendingAnnotations, hasChanges, handleSave]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if user is typing in a textarea, input, or contenteditable element
      const target = e.target as HTMLElement;
      const isInputField = target.tagName === 'TEXTAREA' || target.tagName === 'INPUT' || target.isContentEditable;

      // Cmd/Ctrl + S to save
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
        return;
      }

      // Cmd/Ctrl + P to toggle preview (only when not already in preview)
      if ((e.metaKey || e.ctrlKey) && e.key === 'p' && !isPreviewOpen) {
        e.preventDefault();
        handleOpenPreview();
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isPreviewOpen, handleOpenPreview]);

  return (
    <>
      <FilmstripEditor
        tutorial={initialTutorial}
        steps={steps}
        saveStatus={isSaving || isReordering ? 'saving' : saveStatus}
        selectedStepId={selectedStepId}
        onSelectStep={handleSelectStep}
        onStepCaptionChange={handleStepCaptionChange}
        onStepAnnotationsChange={handleStepAnnotationsChange}
        onDeleteStep={handleDeleteStep}
        onReorderSteps={handleReorderSteps}
        onAddStep={handleAddStep}
        onPreview={handleOpenPreview}
      />

      {/* Preview overlay */}
      {isPreviewOpen && (
        <PreviewOverlay
          steps={steps}
          currentStepIndex={previewStepIndex}
          onStepChange={handlePreviewStepChange}
          onClose={handleClosePreview}
        />
      )}
    </>
  );
}
