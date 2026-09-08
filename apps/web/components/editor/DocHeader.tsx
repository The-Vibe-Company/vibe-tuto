'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Share2, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/dashboard/ShareDialog';
import type { SaveStatus } from './EditorClient';
import { cn } from '@/lib/utils';

interface DocHeaderProps {
  saveStatus: SaveStatus;
  tutorialId: string;
  tutorialTitle?: string;
  tutorialSlug?: string | null;
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  hasSourcesForGeneration?: boolean;
}

export function DocHeader({
  saveStatus,
  tutorialId,
  tutorialTitle,
  tutorialSlug,
  onGenerateClick,
  isGenerating,
  hasSourcesForGeneration,
}: DocHeaderProps) {
  const [shareDialogOpen, setShareDialogOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-stone-200/60 bg-white/85 px-6 backdrop-blur-xl backdrop-saturate-150">
        {/* Brand + breadcrumbs */}
        <nav className="flex min-w-0 items-center gap-1.5 font-sans text-[13px]">
          <Link
            href="/dashboard"
            className="mr-1 flex flex-shrink-0 items-center"
            aria-label="Home"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/captuto-mark.svg"
              alt=""
              className="h-7 w-7 rounded-md"
            />
          </Link>
          <span className="font-mono text-stone-300">/</span>
          <Link
            href="/dashboard"
            className="text-stone-500 transition-colors hover:text-stone-900"
          >
            Tutorials
          </Link>
          <span className="font-mono text-stone-300">/</span>
          <span className="max-w-[280px] truncate font-semibold text-stone-900">
            {tutorialTitle || 'Editor'}
          </span>
        </nav>

        {/* Right side */}
        <div className="ml-auto flex items-center gap-2">
          <SaveStatusDot status={saveStatus} />

          {onGenerateClick && hasSourcesForGeneration && (
            <Button
              size="sm"
              onClick={onGenerateClick}
              disabled={isGenerating}
              className="ml-1 h-9 gap-2 border-0 bg-brand-600 px-3.5 text-[13px] font-medium text-white shadow-brand transition-all hover:bg-brand-500 hover:shadow-brand-lg"
            >
              {isGenerating ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              <span>Generate with AI</span>
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShareDialogOpen(true)}
            className="h-9 gap-2 border-stone-200 bg-white text-[13px] text-stone-700 hover:border-stone-300 hover:bg-stone-50"
          >
            <Share2 className="h-3.5 w-3.5" />
            Share
          </Button>
        </div>
      </header>

      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        tutorialId={tutorialId}
        tutorialTitle={tutorialTitle || 'Untitled'}
        tutorialSlug={tutorialSlug || null}
      />
    </>
  );
}

function SaveStatusDot({ status }: { status: SaveStatus }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5">
            {status === 'saving' ? (
              <Loader2 className="h-3 w-3 animate-spin text-stone-400" />
            ) : (
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors duration-300',
                  status === 'saved' && 'bg-emerald-500',
                  status === 'error' && 'bg-red-500',
                  status === 'unsaved' && 'animate-pulse bg-amber-500',
                )}
              />
            )}
            <span
              className={cn(
                'font-mono text-[11px] font-medium uppercase tracking-[0.06em] transition-colors duration-200',
                status === 'saved' && 'text-emerald-700',
                status === 'saving' && 'text-stone-500',
                status === 'error' && 'text-red-700',
                status === 'unsaved' && 'text-amber-700',
              )}
            >
              {status === 'saving' && 'Saving…'}
              {status === 'saved' && 'Saved'}
              {status === 'error' && 'Error'}
              {status === 'unsaved' && 'Unsaved'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === 'saving' && 'Saving in progress…'}
          {status === 'saved' && 'All changes saved'}
          {status === 'error' && 'Error saving. Please try again.'}
          {status === 'unsaved' && 'Unsaved changes'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
