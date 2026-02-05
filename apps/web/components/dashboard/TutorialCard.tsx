'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import { MoreVertical, Pencil, Share2, Trash2, Loader2, ImageIcon, Globe, GlobeLock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

export interface TutorialCardProps {
  id: string;
  title: string;
  slug?: string | null;
  status: 'draft' | 'processing' | 'ready' | 'error';
  visibility?: string;
  stepsCount: number;
  thumbnailUrl?: string;
  createdAt: string;
  onEdit: () => void;
  onDelete: () => void;
  onShare?: () => void;
}

const publishedConfig = {
  published: {
    label: 'Published',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: Globe,
  },
  notPublished: {
    label: 'Unpublished',
    className: 'bg-stone-100 text-stone-600 border-stone-200',
    icon: GlobeLock,
  },
};

function TutorialCardComponent({
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
  onShare,
}: TutorialCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isPublished = visibility === 'link_only' || visibility === 'public';
  const publishInfo = isPublished ? publishedConfig.published : publishedConfig.notPublished;
  const PublishIcon = publishInfo.icon;

  const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  return (
    <>
      <Card className="group overflow-hidden transition-all hover:shadow-lg cursor-pointer" onClick={onEdit}>
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-stone-50 to-stone-100">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-contain"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              loading="lazy"
              decoding="async"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-stone-300">
              <div className="rounded-xl bg-stone-200/50 p-4">
                <ImageIcon className="h-10 w-10" />
              </div>
              <span className="mt-2 text-xs text-stone-400">No preview</span>
            </div>
          )}

          {/* Published Status Badge */}
          <Badge
            variant="outline"
            className={`absolute left-2 top-2 gap-1.5 border px-2 py-1 text-xs font-medium shadow-sm ${publishInfo.className}`}
          >
            <PublishIcon className="h-3 w-3" />
            {publishInfo.label}
          </Badge>

          {/* Action buttons - Show on hover */}
          <div
            className="absolute inset-0 z-10 flex items-center justify-center gap-3 bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <Button
              onClick={onEdit}
              className="gap-2 bg-white text-stone-900 hover:bg-stone-100"
              size="sm"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </Button>
            <Button
              onClick={() => setShareDialogOpen(true)}
              className="gap-2 bg-white text-stone-900 hover:bg-stone-100"
              size="sm"
            >
              <Share2 className="h-4 w-4" />
              Publish
            </Button>
          </div>

          {/* Actions Menu */}
          <div
            className="absolute right-2 top-2 z-20 opacity-0 transition-opacity group-hover:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 bg-white/90 hover:bg-white"
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="truncate font-medium text-stone-900">{title}</h3>
          <div className="mt-2 flex items-center justify-between text-sm text-stone-500">
            <span>{stepsCount} step{stepsCount !== 1 ? 's' : ''}</span>
            <span>{formattedDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete tutorial</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{title}&quot;? This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
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
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share Dialog */}
      <ShareDialog
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        tutorialId={id}
        tutorialTitle={title}
        tutorialSlug={slug || null}
      />
    </>
  );
}

// Memoize to prevent unnecessary re-renders
export const TutorialCard = memo(TutorialCardComponent, (prev, next) => {
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
