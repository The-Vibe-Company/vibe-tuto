'use client';

import { Textarea } from '@/components/ui/textarea';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { MousePointerClick, ArrowRight, ExternalLink } from 'lucide-react';

interface StepViewerProps {
  step: StepWithSignedUrl | null;
  stepNumber: number;
  onTextChange: (text: string) => void;
}

export function StepViewer({ step, stepNumber, onTextChange }: StepViewerProps) {
  if (!step) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-gray-500">Sélectionnez une étape pour l'éditer</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-6">
      {/* Step header */}
      <div className="mb-4 flex items-center gap-3">
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
          {stepNumber}
        </span>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          {step.click_type === 'navigation' ? (
            <>
              <ArrowRight className="h-4 w-4" />
              <span>Navigation</span>
            </>
          ) : (
            <>
              <MousePointerClick className="h-4 w-4" />
              <span>Clic</span>
            </>
          )}
        </div>
      </div>

      {/* Screenshot with click overlay */}
      <div className="relative mb-6 overflow-hidden rounded-lg border bg-gray-100">
        {step.signedScreenshotUrl ? (
          <div className="relative">
            <img
              src={step.signedScreenshotUrl}
              alt={`Screenshot de l'étape ${stepNumber}`}
              className="w-full"
            />
            {/* Click position overlay */}
            {step.click_x != null && step.click_y != null && (
              <div
                className="absolute h-8 w-8 -translate-x-1/2 -translate-y-1/2 animate-pulse rounded-full border-4 border-red-500 bg-red-500/20"
                style={{
                  left: `${(step.click_x / 1920) * 100}%`,
                  top: `${(step.click_y / 1080) * 100}%`,
                }}
              />
            )}
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <p className="text-gray-400">Aucune capture d'écran</p>
          </div>
        )}
      </div>

      {/* URL */}
      {step.url && (
        <div className="mb-4 flex items-center gap-2 rounded-md bg-gray-100 px-3 py-2 text-sm">
          <ExternalLink className="h-4 w-4 text-gray-400" />
          <span className="truncate text-gray-600">{step.url}</span>
        </div>
      )}

      {/* Text editor */}
      <div>
        <label htmlFor="step-text" className="mb-2 block text-sm font-medium text-gray-700">
          Description de l'étape
        </label>
        <Textarea
          id="step-text"
          placeholder="Décrivez cette étape... (ex: Cliquez sur le bouton 'Connexion' en haut à droite)"
          value={step.text_content || ''}
          onChange={(e) => onTextChange(e.target.value)}
          rows={4}
          className="resize-none"
        />
      </div>
    </div>
  );
}
