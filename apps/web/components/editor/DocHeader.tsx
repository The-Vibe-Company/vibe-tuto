'use client';

import { useState } from 'react';
import { Loader2, Share2, Sparkles } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { ShareDialog } from '@/components/dashboard/ShareDialog';
import { PageHeader } from '@/components/shared/PageHeader';
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
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Tutorials', href: '/dashboard' },
          { label: tutorialTitle || 'Editor' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <SaveStatusDot status={saveStatus} />

            {onGenerateClick && hasSourcesForGeneration && (
              <Button
                size="sm"
                onClick={onGenerateClick}
                disabled={isGenerating}
                className="gap-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-sm hover:from-violet-700 hover:to-indigo-700 border-0"
              >
                {isGenerating ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Sparkles className="h-3.5 w-3.5" />
                )}
                <span className="text-xs font-medium">Generate with AI</span>
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-3.5 w-3.5" />
              <span className="text-xs">Share</span>
            </Button>
          </div>
        }
      />

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
          <div className="flex items-center gap-1.5 px-2 py-1">
            {status === 'saving' ? (
              <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
            ) : (
              <div
                className={cn(
                  'h-2 w-2 rounded-full transition-colors duration-300',
                  status === 'saved' && 'bg-emerald-500',
                  status === 'error' && 'bg-red-500',
                  status === 'unsaved' && 'bg-amber-500 animate-pulse'
                )}
              />
            )}
            <span
              className={cn(
                'text-xs font-medium transition-colors duration-200',
                status === 'saved' && 'text-emerald-600 dark:text-emerald-400',
                status === 'saving' && 'text-muted-foreground',
                status === 'error' && 'text-red-600 dark:text-red-400',
                status === 'unsaved' && 'text-amber-600 dark:text-amber-400'
              )}
            >
              {status === 'saving' && 'Saving...'}
              {status === 'saved' && 'Saved'}
              {status === 'error' && 'Error'}
              {status === 'unsaved' && 'Unsaved'}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {status === 'saving' && 'Saving in progress...'}
          {status === 'saved' && 'All changes are saved'}
          {status === 'error' && 'Error saving. Please try again.'}
          {status === 'unsaved' && 'Unsaved changes'}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
