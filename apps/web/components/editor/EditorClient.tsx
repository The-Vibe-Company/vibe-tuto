'use client';

import { useState, useCallback } from 'react';
import { EditorHeader } from './EditorHeader';
import { StepSidebar } from './StepSidebar';
import { StepViewer } from './StepViewer';
import { AudioPlayer } from './AudioPlayer';
import type { Tutorial, StepWithSignedUrl } from '@/lib/types/editor';

interface EditorClientProps {
  initialTutorial: Tutorial;
  initialSteps: StepWithSignedUrl[];
  audioUrl: string | null;
}

export function EditorClient({ initialTutorial, initialSteps, audioUrl }: EditorClientProps) {
  const [steps, setSteps] = useState(initialSteps);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(
    initialSteps[0]?.id ?? null
  );
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);

  const selectedStep = steps.find((s) => s.id === selectedStepId) ?? null;
  const selectedStepIndex = steps.findIndex((s) => s.id === selectedStepId);
  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSelectStep = useCallback((stepId: string) => {
    setSelectedStepId(stepId);
  }, []);

  const handleTextChange = useCallback((text: string) => {
    if (!selectedStepId) return;

    // Update local steps state for immediate UI feedback
    setSteps((prev) =>
      prev.map((step) =>
        step.id === selectedStepId ? { ...step, text_content: text } : step
      )
    );

    // Track pending changes
    setPendingChanges((prev) => ({
      ...prev,
      [selectedStepId]: text,
    }));
  }, [selectedStepId]);

  const handleSave = useCallback(async () => {
    if (!hasChanges) return;

    setIsSaving(true);

    try {
      // Save all pending changes
      const savePromises = Object.entries(pendingChanges).map(async ([stepId, text]) => {
        const response = await fetch(`/api/steps/${stepId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ text_content: text }),
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
    } catch (error) {
      console.error('Failed to save:', error);
      // Keep pending changes on error so user can retry
      alert('Erreur lors de la sauvegarde. Veuillez réessayer.');
    } finally {
      setIsSaving(false);
    }
  }, [pendingChanges, hasChanges]);

  return (
    <div className="flex h-screen flex-col">
      <EditorHeader
        title={initialTutorial.title}
        isSaving={isSaving}
        hasChanges={hasChanges}
        onSave={handleSave}
      />

      <div className="border-b bg-white px-4 py-3">
        <AudioPlayer audioUrl={audioUrl} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        <StepSidebar
          steps={steps}
          selectedStepId={selectedStepId}
          onSelectStep={handleSelectStep}
        />

        <StepViewer
          step={selectedStep}
          stepNumber={selectedStepIndex + 1}
          onTextChange={handleTextChange}
        />
      </div>
    </div>
  );
}
