'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Save, Eye, Loader2 } from 'lucide-react';

interface EditorHeaderProps {
  title: string;
  isSaving: boolean;
  hasChanges: boolean;
  onSave: () => void;
}

export function EditorHeader({ title, isSaving, hasChanges, onSave }: EditorHeaderProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b bg-white px-4">
      <div className="flex items-center gap-4">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Retour
          </Button>
        </Link>
        <h1 className="text-lg font-semibold truncate max-w-md">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled>
          <Eye className="mr-2 h-4 w-4" />
          Aperçu
        </Button>
        <Button size="sm" onClick={onSave} disabled={isSaving || !hasChanges}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sauvegarde...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Sauvegarder
            </>
          )}
        </Button>
      </div>
    </header>
  );
}
