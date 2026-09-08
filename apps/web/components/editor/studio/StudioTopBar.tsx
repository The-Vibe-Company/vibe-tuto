'use client';

import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Icon, ICON } from './icons';
import { ShareDialog } from '@/components/dashboard/ShareDialog';
import type { SaveStatus } from '../EditorClient';
import type { Tutorial } from '@/lib/types/editor';

export type StudioMode = 'edit' | 'preview' | 'reader';

interface StudioTopBarProps {
  tutorial: Tutorial;
  saveStatus: SaveStatus;
  mode: StudioMode;
  onModeChange: (mode: StudioMode) => void;
  onTitleChange: (title: string) => void;
  onGenerateClick?: () => void;
  isGenerating?: boolean;
  hasSourcesForGeneration?: boolean;
}

const SAVE_DOT_COLOR: Record<SaveStatus, string> = {
  saved: '#10b981',
  saving: 'rgba(255,255,255,0.5)',
  unsaved: '#f59e0b',
  error: '#ef4444',
};
const SAVE_LABEL: Record<SaveStatus, string> = {
  saved: 'Auto-saved',
  saving: 'Saving…',
  unsaved: 'Unsaved',
  error: 'Save error',
};

export function StudioTopBar({
  tutorial,
  saveStatus,
  mode,
  onModeChange,
  onTitleChange,
  onGenerateClick,
  isGenerating,
  hasSourcesForGeneration,
}: StudioTopBarProps) {
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <header
      style={{
        flex: 'none',
        height: 52,
        padding: '0 14px',
        background: 'var(--stone-950)',
        color: '#fafaf9',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        borderBottom: '1px solid var(--stone-800)',
      }}
    >
      {/* Left cluster: back + logo + title meta */}
      <div className="flex items-center" style={{ gap: 12, minWidth: 0 }}>
        <a
          href="/dashboard"
          className="ed-btn-icon ed-btn-sm"
          style={{
            background: 'transparent',
            border: 0,
            color: 'rgba(250,250,249,0.6)',
          }}
          aria-label="Back to dashboard"
        >
          <Icon d={ICON.back} size={14} />
        </a>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/brand/captuto-mark.svg"
          alt=""
          style={{ width: 26, height: 26, borderRadius: 6, flex: 'none' }}
        />
        <div
          className="flex flex-col"
          style={{ lineHeight: 1.2, minWidth: 0, gap: 0 }}
        >
          <EditableTitle
            value={tutorial.title || ''}
            onSubmit={(v) => v && v !== tutorial.title && onTitleChange(v)}
          />
          <span
            className="flex items-center"
            style={{
              fontSize: 10.5,
              color: 'rgba(250,250,249,0.5)',
              gap: 8,
              minWidth: 0,
              fontFamily: 'var(--studio-font-mono)',
            }}
          >
            <span style={{ whiteSpace: 'nowrap' }}>CapTuto workspace</span>
            <span style={{ opacity: 0.4 }}>·</span>
            <span className="inline-flex items-center" style={{ gap: 4 }}>
              {saveStatus === 'saving' ? (
                <Loader2 className="h-2.5 w-2.5 animate-spin" />
              ) : (
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: 999,
                    background: SAVE_DOT_COLOR[saveStatus],
                  }}
                />
              )}
              {SAVE_LABEL[saveStatus]}
            </span>
          </span>
        </div>
      </div>

      {/* Center: mode segmented */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255,255,255,.05)',
          padding: 3,
          borderRadius: 8,
          border: '1px solid rgba(255,255,255,.06)',
          flex: 'none',
        }}
      >
        {(['edit', 'preview', 'reader'] as const).map((k) => {
          const on = mode === k;
          return (
            <button
              key={k}
              onClick={() => onModeChange(k)}
              style={{
                padding: '5px 12px',
                fontSize: 11.5,
                fontWeight: 600,
                borderRadius: 5,
                background: on ? '#fafaf9' : 'transparent',
                color: on ? 'var(--stone-900)' : 'rgba(250,250,249,0.6)',
                border: 0,
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'capitalize',
              }}
            >
              {k}
            </button>
          );
        })}
      </div>

      {/* Right cluster: AI clean-up + Publish */}
      <div className="flex items-center" style={{ gap: 8, flex: 'none' }}>
        {hasSourcesForGeneration && onGenerateClick && (
          <button
            onClick={onGenerateClick}
            disabled={isGenerating}
            className="ed-btn ed-btn-sm"
            style={{
              background: 'rgba(255,255,255,.06)',
              color: '#fafaf9',
              border: '1px solid rgba(255,255,255,.08)',
            }}
          >
            {isGenerating ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <Icon d={ICON.sparkle} size={13} />
            )}
            <span>AI clean-up</span>
          </button>
        )}
        <button
          onClick={() => setShareOpen(true)}
          className="ed-btn ed-btn-sm"
          style={{ background: 'var(--studio-accent)', color: '#fff', border: 0 }}
        >
          <Icon d={ICON.share} size={13} />
          <span>Publish</span>
        </button>
      </div>

      <ShareDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        tutorialId={tutorial.id}
        tutorialTitle={tutorial.title || 'Untitled'}
        tutorialSlug={tutorial.slug || null}
      />
    </header>
  );
}

function EditableTitle({
  value,
  onSubmit,
}: {
  value: string;
  onSubmit: (next: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (editing) {
    return (
      <input
        autoFocus
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onSubmit(draft.trim());
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            (e.target as HTMLInputElement).blur();
          } else if (e.key === 'Escape') {
            setDraft(value);
            setEditing(false);
          }
        }}
        style={{
          fontFamily: 'var(--studio-font-display)',
          fontWeight: 400,
          fontSize: 17,
          letterSpacing: -0.005,
          color: '#fafaf9',
          background: 'transparent',
          border: 0,
          outline: 'none',
          padding: 0,
          width: '100%',
          minWidth: 100,
          maxWidth: 320,
        }}
      />
    );
  }

  return (
    <button
      onClick={() => {
        setDraft(value);
        setEditing(true);
      }}
      style={{
        fontFamily: 'var(--studio-font-display)',
        fontWeight: 400,
        fontSize: 17,
        letterSpacing: -0.005,
        color: '#fafaf9',
        background: 'transparent',
        border: 0,
        cursor: 'text',
        padding: 0,
        textAlign: 'left',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        maxWidth: 320,
      }}
      title={value || 'Untitled'}
    >
      {value || 'Untitled'}
    </button>
  );
}
