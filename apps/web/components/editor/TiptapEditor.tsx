'use client';

import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { cn } from '@/lib/utils';

interface TiptapEditorProps {
  content: string;
  onChange?: (content: string) => void;
  isHeading?: boolean;
}

/**
 * Tiptap editor component - loaded lazily when user enters edit mode.
 * This keeps the heavy Tiptap bundle out of the initial page load.
 */
export function TiptapEditor({
  content,
  onChange,
  isHeading = false,
}: TiptapEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        bulletList: false,
        orderedList: false,
        blockquote: false,
        codeBlock: false,
        horizontalRule: false,
      }),
    ],
    content,
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: cn(
          'focus:outline-none min-h-[1.5em] max-w-none',
          isHeading ? 'text-lg font-semibold' : 'prose prose-sm prose-stone'
        ),
      },
    },
    onUpdate: ({ editor }) => {
      onChange?.(editor.getHTML());
    },
  });

  // Focus editor when it mounts
  useEffect(() => {
    if (editor) {
      editor.commands.focus('end');
    }
  }, [editor]);

  // Sync content when prop changes (if editor exists)
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content || '');
    }
  }, [content, editor]);

  return (
    <>
      <EditorContent editor={editor} />
      {!isHeading && (
        <div className="mt-1 flex gap-1 border-t border-stone-100 pt-1">
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleBold().run()}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-medium transition-colors',
              editor?.isActive('bold')
                ? 'bg-violet-100 text-violet-700'
                : 'text-stone-500 hover:bg-stone-100'
            )}
          >
            B
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleItalic().run()}
            className={cn(
              'rounded px-2 py-0.5 text-xs italic transition-colors',
              editor?.isActive('italic')
                ? 'bg-violet-100 text-violet-700'
                : 'text-stone-500 hover:bg-stone-100'
            )}
          >
            I
          </button>
          <button
            type="button"
            onClick={() => editor?.chain().focus().toggleCode().run()}
            className={cn(
              'rounded px-2 py-0.5 text-xs font-mono transition-colors',
              editor?.isActive('code')
                ? 'bg-violet-100 text-violet-700'
                : 'text-stone-500 hover:bg-stone-100'
            )}
          >
            {'</>'}
          </button>
        </div>
      )}
    </>
  );
}
