'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ChevronRight,
  ChevronLeft,
  Activity,
  MousePointer2,
  Globe,
  ExternalLink,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import type { SourceWithSignedUrl } from '@/lib/types/editor';
import { getSourceActionType, formatSourceUrl } from '@/lib/types/editor';
import { cn } from '@/lib/utils';

interface SourcesSidebarProps {
  sources: SourceWithSignedUrl[];
  onCreateStepFromSource: (source: SourceWithSignedUrl) => void;
}

interface ElementInfo {
  tag?: string;
  text?: string;
  id?: string;
  className?: string;
}

function TimelineItem({
  source,
  index,
  isClick,
  isCopied,
  onCopy,
  onCreateStep,
}: {
  source: SourceWithSignedUrl;
  index: number;
  isClick: boolean;
  isCopied: boolean;
  onCopy: (e: React.MouseEvent) => void;
  onCreateStep: (e: React.MouseEvent) => void;
}) {
  const elementInfo = source.element_info as ElementInfo | null;

  return (
    <div className="group relative pl-8">
      {/* Timeline dot/icon */}
      <div
        className={cn(
          'absolute left-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white',
          isClick ? 'bg-violet-500' : 'bg-blue-500'
        )}
      >
        {isClick ? (
          <MousePointer2 className="h-3 w-3 text-white" />
        ) : (
          <Globe className="h-3 w-3 text-white" />
        )}
      </div>

      <div
        className={cn(
          'rounded-lg border p-2 transition-all',
          isClick
            ? 'border-violet-100 bg-violet-50/50 hover:border-violet-200'
            : 'border-blue-100 bg-blue-50/50 hover:border-blue-200'
        )}
      >
        {/* Action type label */}
        <div className="mb-1.5 flex items-center justify-between">
          <span
            className={cn(
              'text-xs font-medium',
              isClick ? 'text-violet-600' : 'text-blue-600'
            )}
          >
            {isClick ? 'Click' : 'Page Change'}
          </span>
          <span className="text-xs text-slate-400">#{index + 1}</span>
        </div>

        {/* Screenshot thumbnail (if exists) */}
        {source.signedScreenshotUrl && (
          <div className="relative mb-2 aspect-video w-full overflow-hidden rounded-md bg-slate-100">
            <Image
              src={source.signedScreenshotUrl}
              alt={`Action ${index + 1}`}
              fill
              className="object-cover"
              sizes="250px"
            />

            {/* Click indicator on screenshot */}
            {isClick &&
              source.click_x != null &&
              source.click_y != null &&
              source.viewport_width &&
              source.viewport_height && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: `${(source.click_x / source.viewport_width) * 100}%`,
                    top: `${(source.click_y / source.viewport_height) * 100}%`,
                    transform: 'translate(-50%, -50%)',
                  }}
                >
                  <div className="h-3 w-3 rounded-full bg-violet-500 shadow-md ring-2 ring-white" />
                </div>
              )}
          </div>
        )}

        {/* Info section */}
        <div className="space-y-1">
          {/* Element info for clicks */}
          {isClick && elementInfo?.text && (
            <p className="truncate text-xs text-slate-600">{elementInfo.text}</p>
          )}

          {/* URL for navigation */}
          {!isClick && source.url && (
            <div className="flex items-center gap-1 text-xs text-slate-500">
              <ExternalLink className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{formatSourceUrl(source.url)}</span>
            </div>
          )}
        </div>

        {/* Action buttons on hover */}
        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
          {source.signedScreenshotUrl && (
            <button
              type="button"
              onClick={onCopy}
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-md text-xs transition-colors',
                isCopied
                  ? 'bg-green-500 text-white'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100'
              )}
              title={isCopied ? 'Copied!' : 'Copy URL'}
            >
              {isCopied ? (
                <Check className="h-3 w-3" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          )}
          <button
            type="button"
            onClick={onCreateStep}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md text-white transition-colors',
              isClick
                ? 'bg-violet-500 hover:bg-violet-600'
                : 'bg-blue-500 hover:bg-blue-600'
            )}
            title="Add to tutorial"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function SourcesSidebar({
  sources,
  onCreateStepFromSource,
}: SourcesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Show ALL sources (including those without screenshots for navigation events)
  const allSources = sources;

  if (allSources.length === 0) {
    return null;
  }

  const handleCopyImage = async (
    source: SourceWithSignedUrl,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (!source.signedScreenshotUrl) return;

    try {
      await navigator.clipboard.writeText(source.signedScreenshotUrl);
      setCopiedId(source.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleCreateStep = (
    source: SourceWithSignedUrl,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    onCreateStepFromSource(source);
  };

  return (
    <aside
      className={cn(
        'sticky top-4 flex-shrink-0 transition-all duration-200',
        isCollapsed ? 'w-10' : 'w-72'
      )}
    >
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
          {!isCollapsed && (
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-slate-500" />
              <span className="text-sm font-medium text-slate-700">
                Timeline
              </span>
              <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                {allSources.length}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="flex h-6 w-6 items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
            title={isCollapsed ? 'Expand' : 'Collapse'}
          >
            {isCollapsed ? (
              <ChevronLeft className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>

        {/* Timeline content */}
        {!isCollapsed && (
          <div className="max-h-[calc(100vh-200px)] overflow-y-auto p-3">
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-slate-200" />

              <div className="space-y-3">
                {allSources.map((source, index) => {
                  const actionType = getSourceActionType(source);
                  const isClick = actionType === 'click';

                  return (
                    <TimelineItem
                      key={source.id}
                      source={source}
                      index={index}
                      isClick={isClick}
                      isCopied={copiedId === source.id}
                      onCopy={(e) => handleCopyImage(source, e)}
                      onCreateStep={(e) => handleCreateStep(source, e)}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Collapsed state - show icons */}
        {isCollapsed && (
          <div className="p-1">
            <div className="flex flex-col gap-1">
              {allSources.slice(0, 6).map((source, index) => {
                const actionType = getSourceActionType(source);
                const isClick = actionType === 'click';

                return (
                  <button
                    key={source.id}
                    type="button"
                    onClick={(e) => handleCreateStep(source, e)}
                    className={cn(
                      'flex h-8 w-8 items-center justify-center rounded text-xs font-semibold transition-colors',
                      isClick
                        ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        : 'bg-blue-100 text-blue-600 hover:bg-blue-200'
                    )}
                    title={`Add ${isClick ? 'click' : 'navigation'} ${index + 1}`}
                  >
                    {isClick ? (
                      <MousePointer2 className="h-3.5 w-3.5" />
                    ) : (
                      <Globe className="h-3.5 w-3.5" />
                    )}
                  </button>
                );
              })}
              {allSources.length > 6 && (
                <div className="flex h-8 w-8 items-center justify-center text-xs text-slate-400">
                  +{allSources.length - 6}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
