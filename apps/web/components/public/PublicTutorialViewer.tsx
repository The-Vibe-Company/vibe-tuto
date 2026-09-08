'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Copy, ArrowUpRight } from 'lucide-react';
import { DocStepCard } from '@/components/editor/DocStepCard';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DownloadPdfButton } from './DownloadPdfButton';
import type { StepWithSignedUrl } from '@/lib/types/editor';

interface PublicTutorial {
  id: string;
  title: string;
  description: string | null;
  slug: string | null;
  publicToken?: string | null;
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
}

export function PublicTutorialViewer({ tutorial, steps, shareUrl }: PublicTutorialViewerProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const count = steps.filter(step => step.step_type === 'image' || step.step_type === 'text').length;
  let number = 0;
  const numberedSteps = steps.map(step => ({ step, number: step.step_type === 'image' || step.step_type === 'text' ? ++number : 0 }));
  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl || window.location.href);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2000);
    } catch { setCopyError(true); }
  }
  return <TooltipProvider delayDuration={100}>
    <div className="min-h-screen bg-[#faf8f3] text-stone-900 selection:bg-orange-200">
      <a href="#guide" className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:bg-white focus:p-4">Skip to guide</a>
      <header className="border-b border-stone-200">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="text-xl font-bold tracking-tight">captuto<span className="text-[#bd402d]">.</span></Link>
          <span className="text-xs font-medium uppercase tracking-[0.16em] text-stone-600">A little clarity goes a long way</span>
        </div>
      </header>
      <div className="mx-auto max-w-6xl px-5 sm:px-8">
        <section className="max-w-4xl py-12 sm:py-20" aria-labelledby="tutorial-title">
          <p className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.14em] text-[#ad3d2b]">
            <span className="h-2 w-2 rounded-full bg-[#bd402d]" aria-hidden="true" /> Step-by-step guide <span className="text-stone-500">/ {count} {count === 1 ? 'step' : 'steps'}</span>
          </p>
          <h1 id="tutorial-title" className="max-w-3xl break-words text-4xl font-semibold leading-[1.08] tracking-[-0.045em] sm:text-6xl">{tutorial.title}</h1>
          {tutorial.description && <p className="mt-6 max-w-2xl whitespace-pre-wrap text-lg leading-relaxed text-stone-600">{tutorial.description}</p>}
          <div className="mt-8 flex flex-wrap items-start gap-3">
            {tutorial.publicToken && <DownloadPdfButton url={`/api/public/tutorials/${encodeURIComponent(tutorial.publicToken)}/pdf`} title={tutorial.title} />}
            <div>
              <Button variant="ghost" className="min-h-11 gap-2" onClick={copyLink}>{copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}{copied ? 'Link copied' : 'Copy link'}</Button>
              {copyError && <p role="alert" className="mt-2 text-sm text-red-700">Copy the address from your browser to share this guide.</p>}
            </div>
          </div>
        </section>
        <div className="grid items-start gap-12 pb-20 lg:grid-cols-[200px_minmax(0,1fr)]">
          <aside className="hidden lg:sticky lg:top-8 lg:block" aria-label="Guide contents">
            <p className="mb-5 text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">In this guide</p>
            <nav className="max-h-[70vh] space-y-1 overflow-y-auto">
              {numberedSteps.filter(item => item.number > 0).map(({ step, number }) => <a key={step.id} href={`#step-${step.id}`} className="flex gap-3 rounded-md px-2 py-2.5 text-sm leading-snug text-stone-600 hover:bg-stone-200/50 hover:text-stone-950 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
                <span className="tabular-nums text-[#ad3d2b]">{String(number).padStart(2, '0')}</span><span className="line-clamp-2 break-words">{step.text_content || `Step ${number}`}</span>
              </a>)}
            </nav>
          </aside>
          <main id="guide" className="min-w-0 space-y-8">
            {numberedSteps.map(({ step, number }, index) => {
              const previous = [...steps.slice(0, index)].reverse().find(item => item.step_type === 'image' || item.step_type === 'text');
              return <section key={step.id} id={`step-${step.id}`} aria-label={number ? `Step ${number}` : undefined} className="scroll-mt-8 overflow-hidden rounded-xl border border-stone-200 bg-white shadow-sm">
                <DocStepCard step={step} stepNumber={number} previousStepUrl={previous?.url || previous?.source?.url || null} readOnly flattened={Boolean(tutorial.publicToken)} />
              </section>;
            })}
            {steps.length === 0 && <p className="rounded-xl border border-dashed border-stone-300 px-8 py-16 text-center text-stone-600">This guide is being prepared. Check back soon.</p>}
            {steps.length > 0 && <div className="border-t border-stone-200 pt-8"><p className="text-lg font-medium">You’re all set.</p><p className="mt-1 text-sm text-stone-600">Keep this guide handy whenever you need a refresher.</p></div>}
          </main>
        </div>
      </div>
      <footer className="border-t border-stone-200">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm sm:px-8">
          <p className="text-stone-600">Recorded once. Shared clearly.</p>
          <Link href="/login" className="inline-flex min-h-11 items-center gap-2 font-medium text-[#ad3d2b]">Create a guide with Captuto <ArrowUpRight className="h-4 w-4" /></Link>
        </div>
      </footer>
    </div>
  </TooltipProvider>;
}
