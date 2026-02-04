'use client';

import { Share2, ExternalLink, Clock, Calendar } from 'lucide-react';
import { DocStepCard } from '@/components/editor/DocStepCard';
import type { StepWithSignedUrl } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

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

interface PublicTutorialViewerProps {
  tutorial: PublicTutorial;
  steps: StepWithSignedUrl[];
  shareUrl?: string;
  isEmbed?: boolean;
}

export function PublicTutorialViewer({
  tutorial,
  steps,
  shareUrl,
  isEmbed = false,
}: PublicTutorialViewerProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = shareUrl || window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers without clipboard API
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Filter to only show image and text steps (not dividers/headings in embed mode)
  const visibleSteps = steps;

  // Count steps with screenshots for the step counter
  let stepCounter = 0;

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('fr-FR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className={isEmbed ? 'min-h-screen bg-white' : 'min-h-screen bg-slate-50'}>
      {/* Header (hidden in embed mode) */}
      {!isEmbed && (
        <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/80 backdrop-blur-sm">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500">
                <span className="text-sm font-bold text-white">V</span>
              </div>
              <span className="font-semibold text-slate-900">Vibe Tuto</span>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleShare}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              {copied ? 'Copie !' : 'Partager'}
            </Button>
          </div>
        </header>
      )}

      {/* Main content */}
      <main className={isEmbed ? 'p-4' : 'mx-auto max-w-4xl px-6 py-8'}>
        {/* Title and description */}
        <div className={isEmbed ? 'mb-6' : 'mb-8'}>
          <h1 className={`font-bold text-slate-900 ${isEmbed ? 'text-xl' : 'text-3xl'}`}>
            {tutorial.title}
          </h1>

          {tutorial.description && (
            <p className={`mt-2 text-slate-600 ${isEmbed ? 'text-sm' : 'text-lg'}`}>
              {tutorial.description}
            </p>
          )}

          {/* Meta info (hidden in embed) */}
          {!isEmbed && tutorial.publishedAt && (
            <div className="mt-4 flex items-center gap-4 text-sm text-slate-500">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(tutorial.publishedAt)}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>{steps.length} etape{steps.length > 1 ? 's' : ''}</span>
              </div>
            </div>
          )}
        </div>

        {/* Steps */}
        <div className={isEmbed ? 'space-y-4' : 'space-y-6'}>
          {visibleSteps.map((step) => {
            // Increment counter for image/text steps
            const isCountedStep = step.step_type === 'image' || step.step_type === 'text';
            if (isCountedStep) {
              stepCounter++;
            }

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

        {/* Empty state */}
        {visibleSteps.length === 0 && (
          <div className="rounded-lg border border-slate-200 bg-white p-12 text-center">
            <p className="text-slate-500">Ce tutoriel n'a pas encore de contenu.</p>
          </div>
        )}
      </main>

      {/* Footer for embed (link to full version) */}
      {isEmbed && shareUrl && (
        <footer className="border-t border-slate-200 bg-slate-50 p-3">
          <a
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 text-sm text-slate-600 hover:text-violet-600"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Voir le tutoriel complet</span>
          </a>
        </footer>
      )}
    </div>
  );
}
