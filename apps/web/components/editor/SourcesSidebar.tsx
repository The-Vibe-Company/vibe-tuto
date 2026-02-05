'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import {
  ChevronRight,
  ChevronLeft,
  MousePointerClick,
  Globe,
  Layers,
  ExternalLink,
  Plus,
  Copy,
  Check,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { SourceWithSignedUrl, SourceActionType } from '@/lib/types/editor';
import { getSourceActionType, formatSourceUrl } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
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
  tabTitle?: string;
}

// Action type configuration
const ACTION_CONFIG = {
  click: {
    icon: MousePointerClick,
    label: 'Click',
    dotColor: 'bg-violet-500',
    dotGlow: 'shadow-violet-500/40',
    badgeBg: 'bg-violet-500/10 dark:bg-violet-500/20',
    badgeText: 'text-violet-600 dark:text-violet-400',
    badgeBorder: 'border-violet-200/60 dark:border-violet-500/30',
    cardBorder: 'border-violet-100 dark:border-violet-900/40',
    cardHoverBorder: 'hover:border-violet-300 dark:hover:border-violet-700/60',
    cardBg: 'bg-violet-50/30 dark:bg-violet-950/20',
    addBtnBg: 'bg-violet-500 hover:bg-violet-600',
  },
  navigation: {
    icon: Globe,
    label: 'Navigation',
    dotColor: 'bg-sky-500',
    dotGlow: 'shadow-sky-500/40',
    badgeBg: 'bg-sky-500/10 dark:bg-sky-500/20',
    badgeText: 'text-sky-600 dark:text-sky-400',
    badgeBorder: 'border-sky-200/60 dark:border-sky-500/30',
    cardBorder: 'border-sky-100 dark:border-sky-900/40',
    cardHoverBorder: 'hover:border-sky-300 dark:hover:border-sky-700/60',
    cardBg: 'bg-sky-50/30 dark:bg-sky-950/20',
    addBtnBg: 'bg-sky-500 hover:bg-sky-600',
  },
  tab_change: {
    icon: Layers,
    label: 'Tab Switch',
    dotColor: 'bg-amber-500',
    dotGlow: 'shadow-amber-500/40',
    badgeBg: 'bg-amber-500/10 dark:bg-amber-500/20',
    badgeText: 'text-amber-600 dark:text-amber-400',
    badgeBorder: 'border-amber-200/60 dark:border-amber-500/30',
    cardBorder: 'border-amber-100 dark:border-amber-900/40',
    cardHoverBorder: 'hover:border-amber-300 dark:hover:border-amber-700/60',
    cardBg: 'bg-amber-50/30 dark:bg-amber-950/20',
    addBtnBg: 'bg-amber-500 hover:bg-amber-600',
  },
} as const;

interface TimelineItemProps {
  source: SourceWithSignedUrl;
  index: number;
  actionType: SourceActionType;
  isCopied: boolean;
  isLast: boolean;
  onCopy: (e: React.MouseEvent) => void;
  onCreateStep: (e: React.MouseEvent) => void;
}

function TimelineItemComponent({
  source,
  index,
  actionType,
  isCopied,
  isLast,
  onCopy,
  onCreateStep,
}: TimelineItemProps) {
  const elementInfo = source.element_info as ElementInfo | null;
  const config = ACTION_CONFIG[actionType];
  const ActionIcon = config.icon;

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: index * 0.03 }}
      className="group relative pl-10"
    >
      {/* Timeline connector line */}
      {!isLast && (
        <div className="absolute left-[13px] top-8 bottom-0 w-px bg-gradient-to-b from-border to-transparent" />
      )}

      {/* Timeline dot */}
      <div className="absolute left-0 top-1.5">
        <div
          className={cn(
            'relative flex h-[26px] w-[26px] items-center justify-center rounded-full transition-all duration-300',
            'ring-[3px] ring-background',
            config.dotColor,
            'group-hover:scale-110',
            `group-hover:shadow-lg group-hover:${config.dotGlow}`
          )}
        >
          <ActionIcon className="h-3 w-3 text-white" strokeWidth={2.5} />
          {/* Pulse ring on hover */}
          <div
            className={cn(
              'absolute inset-0 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100',
              config.dotColor,
              'animate-ping'
            )}
            style={{ animationDuration: '2s' }}
          />
        </div>
      </div>

      {/* Card */}
      <div
        className={cn(
          'relative overflow-hidden rounded-xl border transition-all duration-200',
          config.cardBorder,
          config.cardHoverBorder,
          config.cardBg,
          'group-hover:shadow-md'
        )}
      >
        {/* Top bar: badge + index */}
        <div className="flex items-center justify-between px-3 py-2">
          <div
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider',
              config.badgeBg,
              config.badgeText,
              config.badgeBorder
            )}
          >
            <ActionIcon className="h-3 w-3" strokeWidth={2} />
            {config.label}
          </div>
          <span className="text-[10px] font-medium tabular-nums text-muted-foreground/60">
            #{index + 1}
          </span>
        </div>

        {/* Thumbnail */}
        {source.signedScreenshotUrl && (
          <div className="relative mx-2 mb-2 overflow-hidden rounded-lg border border-border/40 bg-muted/50">
            <div className="relative h-[120px] w-full overflow-hidden">
              <Image
                src={source.signedScreenshotUrl}
                alt={`Action ${index + 1}`}
                fill
                className="object-cover object-left-top transition-transform duration-300 group-hover:scale-[1.03]"
                sizes="220px"
                loading="lazy"
                decoding="async"
              />
              {/* Gradient overlay at edges */}
              <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/20 to-transparent" />
              <div className="absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-black/10 to-transparent" />
            </div>

            {/* Click indicator */}
            {actionType === 'click' &&
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
                  {/* Outer ring */}
                  <div className="absolute inset-0 -m-2.5 rounded-full border-2 border-violet-400/50 bg-violet-400/10" />
                  {/* Inner dot */}
                  <div className="h-2.5 w-2.5 rounded-full bg-violet-500 shadow-lg shadow-violet-500/50 ring-2 ring-white/80" />
                </div>
              )}
          </div>
        )}

        {/* Info section */}
        <div className="space-y-1 px-3 pb-2">
          {/* Element text for clicks */}
          {actionType === 'click' && elementInfo?.text && (
            <p className="truncate text-xs font-medium text-foreground/80">
              {elementInfo.text}
            </p>
          )}

          {/* Tab title for tab changes */}
          {actionType === 'tab_change' && elementInfo?.tabTitle && (
            <p className="truncate text-xs font-medium text-foreground/80">
              {elementInfo.tabTitle}
            </p>
          )}

          {/* URL */}
          {(actionType === 'navigation' || actionType === 'tab_change') && source.url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{formatSourceUrl(source.url)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs break-all">
                {source.url}
              </TooltipContent>
            </Tooltip>
          )}
        </div>

        {/* Hover action bar */}
        <div className="flex items-center gap-1 border-t border-transparent px-2 pb-2 pt-0 opacity-0 transition-all duration-200 group-hover:border-border/30 group-hover:pt-2 group-hover:opacity-100">
          {source.signedScreenshotUrl && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCopy}
                  className={cn(
                    'h-7 w-7 rounded-lg transition-all',
                    isCopied
                      ? 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 hover:text-emerald-600'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {isCopied ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                {isCopied ? 'Copied!' : 'Copy image URL'}
              </TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size="sm"
                onClick={onCreateStep}
                className={cn(
                  'h-7 flex-1 gap-1.5 rounded-lg text-xs font-medium text-white',
                  config.addBtnBg
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Add step
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Add to tutorial
            </TooltipContent>
          </Tooltip>
        </div>
      </div>
    </motion.div>
  );
}

const TimelineItem = memo(TimelineItemComponent);

// Collapsed sidebar mini-item
function CollapsedItem({
  source,
  index,
  actionType,
  onCreateStep,
}: {
  source: SourceWithSignedUrl;
  index: number;
  actionType: SourceActionType;
  onCreateStep: (e: React.MouseEvent) => void;
}) {
  const config = ACTION_CONFIG[actionType];
  const ActionIcon = config.icon;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          onClick={onCreateStep}
          className={cn(
            'group relative flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-200',
            'hover:scale-105',
            config.cardBg,
            'border',
            config.cardBorder,
            config.cardHoverBorder
          )}
        >
          {source.signedScreenshotUrl ? (
            <div className="relative h-full w-full overflow-hidden rounded-lg">
              <Image
                src={source.signedScreenshotUrl}
                alt={`#${index + 1}`}
                fill
                className="object-cover"
                sizes="36px"
                loading="lazy"
              />
              <div className="absolute inset-0 bg-black/20 transition-colors group-hover:bg-black/10" />
              <div className={cn('absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full', config.dotColor)} />
            </div>
          ) : (
            <ActionIcon className={cn('h-4 w-4', config.badgeText)} />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="text-xs">
        <span className="font-medium">{config.label}</span> #{index + 1}
      </TooltipContent>
    </Tooltip>
  );
}

export function SourcesSidebar({
  sources,
  onCreateStepFromSource,
}: SourcesSidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        'sticky top-20 h-fit flex-shrink-0 transition-all duration-300',
        isCollapsed ? 'w-14' : 'w-[280px]'
      )}
    >
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 px-3 py-2.5">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                </div>
                <span className="text-sm font-semibold text-foreground">Timeline</span>
                <Badge
                  variant="secondary"
                  className="h-5 min-w-[20px] justify-center rounded-full px-1.5 text-[10px] font-bold"
                >
                  {allSources.length}
                </Badge>
              </motion.div>
            )}
          </AnimatePresence>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
              >
                {isCollapsed ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="left" className="text-xs">
              {isCollapsed ? 'Expand timeline' : 'Collapse'}
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Expanded content */}
        <AnimatePresence mode="wait">
          {!isCollapsed && (
            <motion.div
              initial={{ opacity: 0, width: 280 }}
              animate={{ opacity: 1, width: 280 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <ScrollArea className="h-[calc(100vh-220px)]" style={{ maxWidth: '100%' }}>
                <div className="max-w-[280px] p-3 pr-2">
                  <div className="space-y-3">
                    {allSources.map((source, index) => {
                      const actionType = getSourceActionType(source);
                      return (
                        <TimelineItem
                          key={source.id}
                          source={source}
                          index={index}
                          actionType={actionType}
                          isCopied={copiedId === source.id}
                          isLast={index === allSources.length - 1}
                          onCopy={(e) => handleCopyImage(source, e)}
                          onCreateStep={(e) => handleCreateStep(source, e)}
                        />
                      );
                    })}
                  </div>
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed content */}
        <AnimatePresence mode="wait">
          {isCollapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <ScrollArea className="h-[calc(100vh-220px)]">
                <div className="flex flex-col items-center gap-1.5 p-2">
                  {allSources.map((source, index) => {
                    const actionType = getSourceActionType(source);
                    return (
                      <CollapsedItem
                        key={source.id}
                        source={source}
                        index={index}
                        actionType={actionType}
                        onCreateStep={(e) => handleCreateStep(source, e)}
                      />
                    );
                  })}
                </div>
              </ScrollArea>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}
