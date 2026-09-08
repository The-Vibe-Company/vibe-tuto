'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { MoreVertical, Pencil, Share2, Trash2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ShareDialog } from './ShareDialog';
import type { TutorialCardProps } from './TutorialCard';

type Status = TutorialCardProps['status'];

function statusPill(status: Status, isPublished: boolean) {
  if (isPublished) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-sans text-[11px] font-medium text-emerald-700">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Published
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 font-sans text-[11px] font-medium text-amber-800">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" />
        Processing
      </span>
    );
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2.5 py-1 font-sans text-[11px] font-medium text-red-700">
        Error
      </span>
    );
  }
  return (
    <span className="inline-flex items-center rounded-full border border-stone-200 bg-stone-100 px-2.5 py-1 font-sans text-[11px] font-medium text-stone-600">
      Draft
    </span>
  );
}

function relativeTime(iso: string) {
  const date = new Date(iso);
  const diffSec = Math.round((Date.now() - date.getTime()) / 1000);
  if (diffSec < 60) return 'Just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
  if (diffSec < 86400 * 2) return 'Yesterday';
  if (diffSec < 86400 * 7) return `${Math.floor(diffSec / 86400)}d ago`;
  if (diffSec < 86400 * 30) return `${Math.floor(diffSec / 86400 / 7)}w ago`;
  return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });
}

function TutorialTableRowComponent({
  id,
  title,
  slug,
  status,
  visibility,
  stepsCount,
  thumbnailUrl,
  createdAt,
  onEdit,
  onDelete,
}: TutorialCardProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPublished = visibility === 'link_only' || visibility === 'public';

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setDeleteOpen(false);
    }
  };

  return (
    <>
      <div
        onClick={onEdit}
        className="group grid cursor-pointer grid-cols-[42px_minmax(0,1.6fr)_120px_minmax(0,0.8fr)_minmax(0,0.6fr)_32px] items-center gap-4 px-5 py-3 transition-colors hover:bg-stone-50"
      >
        {/* Thumbnail */}
        <div className="relative h-10 w-10 overflow-hidden rounded-md border border-stone-200/60 bg-gradient-to-br from-brand-50 to-teal-50">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : (
            <div className="absolute left-1/2 top-1/2 h-0 w-0 -translate-x-1/3 -translate-y-1/2 border-y-[5px] border-l-[7px] border-y-transparent border-l-brand-600" />
          )}
        </div>

        {/* Title + meta */}
        <div className="min-w-0">
          <div className="truncate font-sans text-[14px] font-semibold text-stone-900">
            {title || 'Untitled tutorial'}
          </div>
          <div className="mt-1 font-mono text-[11px] text-stone-500">
            {stepsCount} step{stepsCount !== 1 ? 's' : ''}
          </div>
        </div>

        {/* Status */}
        <div>{statusPill(status, isPublished)}</div>

        {/* Updated */}
        <div className="font-mono text-[12px] text-stone-600">
          {relativeTime(createdAt)}
        </div>

        {/* Views (placeholder) */}
        <div className="font-mono text-[12px] text-stone-400">—</div>

        {/* Action menu */}
        <div onClick={(e) => e.stopPropagation()} className="flex justify-end">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                aria-label="Tutorial actions"
                className="flex h-7 w-7 items-center justify-center rounded-md text-stone-500 opacity-0 transition-all hover:bg-stone-200 hover:text-stone-900 group-hover:opacity-100"
              >
                <MoreVertical className="h-4 w-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Pencil className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setShareOpen(true)}>
                <Share2 className="mr-2 h-4 w-4" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setDeleteOpen(true)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Delete confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tutorial</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tutorialId={id}
        tutorialTitle={title}
        tutorialSlug={slug || null}
      />
    </>
  );
}

export const TutorialTableRow = memo(TutorialTableRowComponent, (prev, next) => {
  return (
    prev.id === next.id &&
    prev.title === next.title &&
    prev.status === next.status &&
    prev.visibility === next.visibility &&
    prev.stepsCount === next.stepsCount &&
    prev.thumbnailUrl === next.thumbnailUrl &&
    prev.createdAt === next.createdAt
  );
});
