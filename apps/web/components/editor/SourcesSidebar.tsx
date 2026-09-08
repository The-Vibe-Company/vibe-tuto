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
  Keyboard,
  Command,
  AppWindow,
  Flag,
  Monitor,
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
    dotColor: 'bg-brand-500',
    dotGlow: 'shadow-brand-500/40',
    badgeBg: 'bg-brand-500/10 dark:bg-brand-500/20',
    badgeText: 'text-brand-600 dark:text-brand-400',
    badgeBorder: 'border-brand-200/60 dark:border-brand-500/30',
    cardBorder: 'border-brand-100 dark:border-brand-900/40',
    cardHoverBorder: 'hover:border-brand-300 dark:hover:border-brand-700/60',
    cardBg: 'bg-brand-50/30 dark:bg-brand-950/20',
    addBtnBg: 'bg-brand-500 hover:bg-brand-600',
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
  type: {
    icon: Keyboard,
    label: 'Typing',
    dotColor: 'bg-emerald-500',
    dotGlow: 'shadow-emerald-500/40',
    badgeBg: 'bg-emerald-500/10 dark:bg-emerald-500/20',
    badgeText: 'text-emerald-600 dark:text-emerald-400',
    badgeBorder: 'border-emerald-200/60 dark:border-emerald-500/30',
    cardBorder: 'border-emerald-100 dark:border-emerald-900/40',
    cardHoverBorder: 'hover:border-emerald-300 dark:hover:border-emerald-700/60',
    cardBg: 'bg-emerald-50/30 dark:bg-emerald-950/20',
    addBtnBg: 'bg-emerald-500 hover:bg-emerald-600',
  },
  keyboard_shortcut: {
    icon: Command,
    label: 'Shortcut',
    dotColor: 'bg-orange-500',
    dotGlow: 'shadow-orange-500/40',
    badgeBg: 'bg-orange-500/10 dark:bg-orange-500/20',
    badgeText: 'text-orange-600 dark:text-orange-400',
    badgeBorder: 'border-orange-200/60 dark:border-orange-500/30',
    cardBorder: 'border-orange-100 dark:border-orange-900/40',
    cardHoverBorder: 'hover:border-orange-300 dark:hover:border-orange-700/60',
    cardBg: 'bg-orange-50/30 dark:bg-orange-950/20',
    addBtnBg: 'bg-orange-500 hover:bg-orange-600',
  },
  app_switch: {
    icon: AppWindow,
    label: 'App Switch',
    dotColor: 'bg-blue-500',
    dotGlow: 'shadow-blue-500/40',
    badgeBg: 'bg-blue-500/10 dark:bg-blue-500/20',
    badgeText: 'text-blue-600 dark:text-blue-400',
    badgeBorder: 'border-blue-200/60 dark:border-blue-500/30',
    cardBorder: 'border-blue-100 dark:border-blue-900/40',
    cardHoverBorder: 'hover:border-blue-300 dark:hover:border-blue-700/60',
    cardBg: 'bg-blue-50/30 dark:bg-blue-950/20',
    addBtnBg: 'bg-blue-500 hover:bg-blue-600',
  },
  manual_marker: {
    icon: Flag,
    label: 'Marker',
    dotColor: 'bg-rose-500',
    dotGlow: 'shadow-rose-500/40',
    badgeBg: 'bg-rose-500/10 dark:bg-rose-500/20',
    badgeText: 'text-rose-600 dark:text-rose-400',
    badgeBorder: 'border-rose-200/60 dark:border-rose-500/30',
    cardBorder: 'border-rose-100 dark:border-rose-900/40',
    cardHoverBorder: 'hover:border-rose-300 dark:hover:border-rose-700/60',
    cardBg: 'bg-rose-50/30 dark:bg-rose-950/20',
    addBtnBg: 'bg-rose-500 hover:bg-rose-600',
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
          <span className="text-[10px] font-medium tabular-nums text-stone-500/60">
            #{index + 1}
          </span>
        </div>

        {/* Thumbnail */}
        {source.signedScreenshotUrl && (
          <div className="relative mx-2 mb-2 overflow-hidden rounded-lg border border-stone-200/40 bg-stone-100/50">
            <div className="relative h-[120px] w-full overflow-hidden">
              <Image
                unoptimized
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
                  <div className="absolute inset-0 -m-2.5 rounded-full border-2 border-brand-400/50 bg-brand-400/10" />
                  {/* Inner dot */}
                  <div className="h-2.5 w-2.5 rounded-full bg-brand-500 shadow-lg shadow-brand-500/50 ring-2 ring-white/80" />
                </div>
              )}
          </div>
        )}

        {/* Info section */}
        <div className="space-y-1 px-3 pb-2">
          {/* Auto caption for desktop sources */}
          {source.auto_caption && (
            <p className="truncate text-xs font-medium text-stone-900/">
              {source.auto_caption}
            </p>
          )}

          {/* Element text for clicks (extension sources without auto_caption) */}
          {!source.auto_caption && actionType === 'click' && elementInfo?.text && (
            <p className="truncate text-xs font-medium text-stone-900/">
              {elementInfo.text}
            </p>
          )}

          {/* Tab title for tab changes */}
          {!source.auto_caption && actionType === 'tab_change' && elementInfo?.tabTitle && (
            <p className="truncate text-xs font-medium text-stone-900/">
              {elementInfo.tabTitle}
            </p>
          )}

          {/* App context for desktop sources */}
          {source.app_name && (
            <div className="flex items-center gap-1.5 text-[11px] text-stone-500/70">
              <Monitor className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{source.app_name}</span>
            </div>
          )}

          {/* Window title for desktop sources */}
          {source.window_title && (
            <Tooltip>
              <TooltipTrigger asChild>
                <p className="truncate text-[11px] text-stone-500/50">
                  {source.window_title}
                </p>
              </TooltipTrigger>
              <TooltipContent side="left" className="max-w-xs text-xs">
                {source.window_title}
              </TooltipContent>
            </Tooltip>
          )}

          {/* URL */}
          {(actionType === 'navigation' || actionType === 'tab_change') && source.url && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 text-[11px] text-stone-500/70">
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
        <div className="flex items-center gap-1 border-t border-transparent px-2 pb-2 pt-0 opacity-0 transition-all duration-200 group-hover:border-stone-200/30 group-hover:pt-2 group-hover:opacity-100">
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
                      : 'text-stone-500 hover:text-stone-900'
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
                unoptimized
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
      <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white shadow-sm shadow-stone-200/40">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-stone-200/60 px-3 py-2.5">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.15 }}
                className="flex items-center gap-2.5"
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-brand-50">
                  <Clock className="h-3.5 w-3.5 text-brand-600" />
                </div>
                <span className="font-mono text-[11px] font-medium uppercase tracking-[0.06em] text-stone-500">
                  Timeline
                </span>
                <Badge
                  variant="outline"
                  className="h-5 min-w-[20px] justify-center rounded-full border-stone-200 bg-stone-50 px-1.5 font-mono text-[10px] font-medium text-stone-600"
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
                className="h-7 w-7 rounded-lg text-stone-500 hover:text-stone-900"
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
