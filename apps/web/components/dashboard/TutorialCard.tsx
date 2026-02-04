'use client';

import { useState } from 'react';
import Image from 'next/image';
import { MoreVertical, Pencil, Share2, Trash2, Loader2, Play, ImageIcon, CheckCircle2, AlertCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
  onProcess?: () => Promise<void>;
}

const statusConfig = {
  draft: {
    label: 'Brouillon',
    className: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: null,
  },
  processing: {
    label: 'En attente de traitement',
    className: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: Loader2,
  },
  ready: {
    label: 'Prêt',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  error: {
    label: 'Erreur',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: AlertCircle,
  },
};

export function TutorialCard({
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
  onProcess,
}: TutorialCardProps) {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const statusInfo = statusConfig[status];
  const StatusIcon = statusInfo.icon;

  const handleProcess = async () => {
    if (!onProcess) return;
    setIsProcessing(true);
    try {
      await onProcess();
    } finally {
      setIsProcessing(false);
    }
  };

  const formattedDate = new Date(createdAt).toLocaleDateString('fr-FR', {
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
      <Card className="group overflow-hidden transition-all hover:shadow-lg">
        {/* Thumbnail */}
        <div className="relative aspect-video bg-gradient-to-br from-gray-50 to-gray-100">
          {thumbnailUrl ? (
            <Image
              src={thumbnailUrl}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            />
          ) : (
            <div className="flex h-full flex-col items-center justify-center text-gray-300">
              <div className="rounded-xl bg-gray-200/50 p-4">
                <ImageIcon className="h-10 w-10" />
              </div>
              <span className="mt-2 text-xs text-gray-400">Aucun aperçu</span>
            </div>
          )}

          {/* Status Badge */}
          <Badge 
            variant="outline"
            className={`absolute left-2 top-2 gap-1.5 border px-2 py-1 text-xs font-medium shadow-sm ${statusInfo.className}`}
          >
            {StatusIcon && status === 'processing' && !isProcessing && (
              <StatusIcon className="h-3 w-3 animate-spin" />
            )}
            {StatusIcon && status !== 'processing' && (
              <StatusIcon className="h-3 w-3" />
            )}
            {isProcessing && <Loader2 className="h-3 w-3 animate-spin" />}
            {statusInfo.label}
          </Badge>

          {/* Process Button - Only show for processing status */}
          {status === 'processing' && onProcess && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
              <Button
                onClick={handleProcess}
                disabled={isProcessing}
                className="gap-2 bg-white text-gray-900 hover:bg-gray-100"
                size="sm"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Traitement...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Finaliser
                  </>
                )}
              </Button>
            </div>
          )}

          {/* Actions Menu */}
          <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
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
                <DropdownMenuItem onClick={onEdit}>
                  <Pencil className="mr-2 h-4 w-4" />
                  Modifier
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShareDialogOpen(true)}>
                  <Share2 className="mr-2 h-4 w-4" />
                  Partager
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setDeleteDialogOpen(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Supprimer
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Content */}
        <CardContent className="p-4">
          <h3 className="truncate font-medium text-gray-900">{title}</h3>
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <span>{stepsCount} étape{stepsCount !== 1 ? 's' : ''}</span>
            <span>{formattedDate}</span>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Supprimer le tutoriel</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer &quot;{title}&quot; ? Cette
              action est irréversible.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              Annuler
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Suppression...
                </>
              ) : (
                'Supprimer'
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
