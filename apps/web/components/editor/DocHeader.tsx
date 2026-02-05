'use client';

import { useState } from 'react';
import { Loader2, AlertCircle, Cloud, CloudOff, Share2 } from 'lucide-react';
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
}

export function DocHeader({ saveStatus, tutorialId, tutorialTitle, tutorialSlug }: DocHeaderProps) {
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
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShareDialogOpen(true)}
              className="gap-2"
            >
              <Share2 className="h-4 w-4" />
              Share
            </Button>
            <SaveStatusIndicator status={saveStatus} />
          </>
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

function SaveStatusIndicator({ status }: { status: SaveStatus }) {
  return (
    <TooltipProvider delayDuration={0}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-200',
              status === 'saving' && 'bg-muted text-muted-foreground',
              status === 'saved' && 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
              status === 'error' && 'bg-destructive/10 text-destructive',
              status === 'unsaved' && 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
            )}
          >
            {status === 'saving' && (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Saving...</span>
              </>
            )}
            {status === 'saved' && (
              <>
                <Cloud className="h-3.5 w-3.5" />
                <span>Saved</span>
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-3.5 w-3.5" />
                <span>Error</span>
              </>
            )}
            {status === 'unsaved' && (
              <>
                <CloudOff className="h-3.5 w-3.5" />
                <span>Unsaved</span>
              </>
            )}
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
