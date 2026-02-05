'use client';

import { DocStepCard } from '@/components/editor/DocStepCard';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { TooltipProvider } from '@/components/ui/tooltip';

interface PublicTutorial {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  status: string;
  visibility: string;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

interface EmbedTutorialViewerProps {
  tutorial: PublicTutorial;
  steps: StepWithSignedUrl[];
  shareUrl?: string;
}

export function EmbedTutorialViewer({
  steps,
}: EmbedTutorialViewerProps) {
  let stepCounter = 0;

  return (
    <TooltipProvider delayDuration={100}>
      <div className="bg-transparent px-4 py-4">
        {steps.length > 0 ? (
          <div className="space-y-4">
            {steps.map((step) => {
              const isCountedStep =
                step.step_type === 'image' || step.step_type === 'text';
              if (isCountedStep) stepCounter++;

              return (
                <DocStepCard
                  key={step.id}
                  step={step}
                  stepNumber={isCountedStep ? stepCounter : 0}
                  readOnly
                />
              );
            })}
          </div>
        ) : (
          <p className="py-8 text-center text-sm text-stone-400">
            This tutorial has no content yet.
          </p>
        )}

        {/* Powered by */}
        <div className="pt-6 pb-2 text-center">
          <a
            href="https://captuto.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground"
          >
            Powered by{' '}
            <span className="font-medium text-muted-foreground">CapTuto</span>
          </a>
        </div>
      </div>
    </TooltipProvider>
  );
}
