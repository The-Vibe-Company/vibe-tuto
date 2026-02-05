'use client';

import { useState, useRef, useEffect, Suspense, lazy } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// Lazy load the Tiptap editor component - only loaded when user clicks to edit
const TiptapEditor = lazy(() => import('./TiptapEditor').then(m => ({ default: m.TiptapEditor })));

interface InlineCaptionProps {
  content: string;
  onChange?: (content: string) => void;
  placeholder?: string;
  isHeading?: boolean;
  readOnly?: boolean;
}

/**
 * Click-to-edit caption component using Tiptap.
 * Shows formatted HTML when not editing, Tiptap editor when clicked.
 * Tiptap is ONLY loaded when user enters edit mode (lazy loading).
 */
export function InlineCaption({
  content,
  onChange,
  placeholder,
  isHeading = false,
  readOnly = false,
}: InlineCaptionProps) {
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Click outside to close editor
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isEditing]);

  // Handle escape key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isEditing) {
        setIsEditing(false);
      }
    };

    if (isEditing) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isEditing]);

  // Read-only mode - just display content
  if (readOnly) {
    return (
      <div className="px-2 py-1">
        {content ? (
          <div
            className={cn(
              'max-w-none',
              isHeading
                ? 'text-lg font-semibold text-foreground'
                : 'prose prose-sm dark:prose-invert prose-strong:text-primary'
            )}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : null}
      </div>
    );
  }

  // Display mode (not editing) - NO Tiptap loaded here
  if (!isEditing) {
    return (
      <div
        onClick={() => setIsEditing(true)}
        className="cursor-text rounded-md px-2 py-1 transition-colors hover:bg-muted"
      >
        {content ? (
          <div
            className={cn(
              'max-w-none',
              isHeading
                ? 'text-lg font-semibold text-foreground'
                : 'prose prose-sm dark:prose-invert prose-strong:text-primary'
            )}
            dangerouslySetInnerHTML={{ __html: content }}
          />
        ) : (
          <span className="text-muted-foreground italic">
            {placeholder || 'Click to add a description...'}
          </span>
        )}
      </div>
    );
  }

  // Edit mode - Tiptap is lazily loaded ONLY here
  return (
    <div
      ref={containerRef}
      className="rounded-md border border-primary bg-background px-2 py-1 ring-2 ring-primary/20"
    >
      <Suspense fallback={<Skeleton className="h-6 w-full" />}>
        <TiptapEditor
          content={content}
          onChange={onChange}
          isHeading={isHeading}
        />
      </Suspense>
    </div>
  );
}
