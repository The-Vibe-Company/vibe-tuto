'use client';

import { cn } from '@/lib/utils';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { Check } from 'lucide-react';

interface StepSidebarProps {
  steps: StepWithSignedUrl[];
  selectedStepId: string | null;
  onSelectStep: (stepId: string) => void;
}

export function StepSidebar({ steps, selectedStepId, onSelectStep }: StepSidebarProps) {
  return (
    <aside className="w-64 flex-shrink-0 overflow-y-auto border-r bg-gray-50/50">
      <div className="p-4">
        <h2 className="mb-4 text-sm font-medium text-gray-500">Étapes ({steps.length})</h2>
        <div className="space-y-2">
          {steps.map((step, index) => {
            const isSelected = step.id === selectedStepId;
            const hasText = !!step.text_content?.trim();

            return (
              <button
                key={step.id}
                onClick={() => onSelectStep(step.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors',
                  isSelected
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                )}
              >
                {/* Thumbnail */}
                <div className="relative h-12 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-200">
                  {step.signedScreenshotUrl ? (
                    <img
                      src={step.signedScreenshotUrl}
                      alt={`Step ${index + 1}`}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs text-gray-400">
                      No image
                    </div>
                  )}
                </div>

                {/* Step info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Étape {index + 1}</span>
                    {hasText && (
                      <Check className="h-3.5 w-3.5 text-green-500" />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 capitalize">{step.click_type || 'action'}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
