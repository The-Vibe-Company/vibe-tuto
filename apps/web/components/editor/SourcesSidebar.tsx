'use client';

import { useState, memo } from 'react';
import Image from 'next/image';
import {
  ChevronRight,
  ChevronLeft,
  Activity,
  MousePointer2,
  Globe,
  Layers,
  ExternalLink,
  Plus,
  Copy,
  Check,
} from 'lucide-react';
import type { SourceWithSignedUrl, SourceActionType } from '@/lib/types/editor';
import { getSourceActionType, formatSourceUrl } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

interface TimelineItemProps {
  source: SourceWithSignedUrl;
  index: number;
  actionType: SourceActionType;
  isCopied: boolean;
  onCopy: (e: React.MouseEvent) => void;
  onCreateStep: (e: React.MouseEvent) => void;
}

function TimelineItemComponent({
  source,
  index,
  actionType,
  isCopied,
  onCopy,
  onCreateStep,
}: TimelineItemProps) {
  const elementInfo = source.element_info as ElementInfo | null;

  // Determine styling based on action type
  const getIconAndColor = () => {
    switch (actionType) {
      case 'click':
        return {
          icon: <MousePointer2 className="h-3 w-3 text-primary-foreground" />,
          bgColor: 'bg-primary',
          borderColor: 'border-primary/20 bg-primary/5 hover:border-primary/30',
          badgeColor: 'bg-primary/10 text-primary hover:bg-primary/15',
          buttonColor: 'bg-primary hover:bg-primary/90',
          label: 'Click',
        };
      case 'navigation':
        return {
          icon: <Globe className="h-3 w-3 text-white" />,
          bgColor: 'bg-blue-500',
          borderColor: 'border-blue-200 bg-blue-50/50 hover:border-blue-300 dark:border-blue-900 dark:bg-blue-950/30',
          badgeColor: 'bg-blue-100 text-blue-600 hover:bg-blue-150 dark:bg-blue-900/50 dark:text-blue-400',
          buttonColor: 'bg-blue-500 hover:bg-blue-600',
          label: 'Navigation',
        };
      case 'tab_change':
        return {
          icon: <Layers className="h-3 w-3 text-white" />,
          bgColor: 'bg-amber-500',
          borderColor: 'border-amber-200 bg-amber-50/50 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/30',
          badgeColor: 'bg-amber-100 text-amber-600 hover:bg-amber-150 dark:bg-amber-900/50 dark:text-amber-400',
          buttonColor: 'bg-amber-500 hover:bg-amber-600',
          label: 'Tab Change',
        };
    }
  };

  const { icon, bgColor, borderColor, badgeColor, buttonColor, label } = getIconAndColor();

  return (
    <div className="group relative pl-8">
      {/* Timeline dot/icon */}
      <div
        className={cn(
          'absolute left-0 flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-background transition-transform group-hover:scale-110',
          bgColor
        )}
      >
        {icon}
      </div>

      <Card
        className={cn(
          'overflow-hidden transition-all duration-200 group-hover:shadow-md',
          borderColor
        )}
      >
        <CardContent className="p-2">
          {/* Action type label */}
          <div className="mb-1.5 flex items-center justify-between">
            <Badge
              variant="secondary"
              className={cn('text-[10px] font-medium', badgeColor)}
            >
              {label}
            </Badge>
            <span className="text-[10px] tabular-nums text-muted-foreground">
              #{index + 1}
            </span>
          </div>

          {/* Screenshot thumbnail (if exists) */}
          {source.signedScreenshotUrl && (
            <div className="relative mb-2 h-32 w-full overflow-hidden rounded-md bg-muted">
              <Image
                src={source.signedScreenshotUrl}
                alt={`Action ${index + 1}`}
                fill
                className="object-cover object-top transition-transform group-hover:scale-105"
                sizes="250px"
                loading="lazy"
                decoding="async"
              />

              {/* Click indicator on screenshot (only for clicks) */}
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
                    <div className="h-3 w-3 animate-pulse rounded-full bg-primary shadow-lg ring-2 ring-white" />
                  </div>
                )}
            </div>
          )}

          {/* Info section */}
          <div className="space-y-1">
            {/* Element info for clicks */}
            {actionType === 'click' && elementInfo?.text && (
              <p className="truncate text-xs text-muted-foreground">
                {elementInfo.text}
              </p>
            )}

            {/* Tab title for tab changes */}
            {actionType === 'tab_change' && elementInfo?.tabTitle && (
              <p className="truncate text-xs font-medium text-muted-foreground">
                {elementInfo.tabTitle}
              </p>
            )}

            {/* URL for navigation and tab_change */}
            {(actionType === 'navigation' || actionType === 'tab_change') && source.url && (
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <ExternalLink className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatSourceUrl(source.url)}</span>
              </div>
            )}
          </div>

          {/* Action buttons on hover */}
          <div className="mt-2 flex gap-1 opacity-0 transition-all duration-200 group-hover:opacity-100">
            {source.signedScreenshotUrl && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onCopy}
                    className={cn(
                      'h-7 w-7 transition-colors',
                      isCopied && 'bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 hover:text-white'
                    )}
                  >
                    {isCopied ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      <Copy className="h-3 w-3" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {isCopied ? 'Copied!' : 'Copy URL'}
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  onClick={onCreateStep}
                  className={cn('h-7 w-7', buttonColor)}
                >
                  <Plus className="h-3 w-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Add to tutorial
              </TooltipContent>
            </Tooltip>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const TimelineItem = memo(TimelineItemComponent);

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
        'sticky top-20 h-fit flex-shrink-0 transition-all duration-300',
        isCollapsed ? 'w-12' : 'w-72'
      )}
    >
      <Card className="overflow-hidden">
        {/* Header */}
        <CardHeader className="p-3 pb-0">
          <div className="flex items-center justify-between">
            {!isCollapsed && (
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-muted">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-sm font-medium">Timeline</CardTitle>
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    {allSources.length}
                  </Badge>
                </div>
              </div>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="h-7 w-7"
                >
                  {isCollapsed ? (
                    <ChevronLeft className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent side="left" className="text-xs">
                {isCollapsed ? 'Expand' : 'Collapse'}
              </TooltipContent>
            </Tooltip>
          </div>
        </CardHeader>

        {/* Timeline content */}
        {!isCollapsed && (
          <CardContent className="p-3 pt-3">
            <ScrollArea className="h-[calc(100vh-220px)]">
              <div className="relative pr-2">
                {/* Vertical timeline line */}
                <div className="absolute bottom-0 left-3 top-0 w-0.5 bg-border" />

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
                        onCopy={(e) => handleCopyImage(source, e)}
                        onCreateStep={(e) => handleCreateStep(source, e)}
                      />
                    );
                  })}
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        )}

        {/* Collapsed state - show icons */}
        {isCollapsed && (
          <CardContent className="p-2">
            <div className="flex flex-col gap-1">
              {allSources.slice(0, 8).map((source, index) => {
                const actionType = getSourceActionType(source);

                const getCollapsedIcon = () => {
                  switch (actionType) {
                    case 'click':
                      return {
                        icon: <MousePointer2 className="h-4 w-4" />,
                        className: 'text-primary hover:bg-primary/10 hover:text-primary',
                        label: 'click',
                      };
                    case 'navigation':
                      return {
                        icon: <Globe className="h-4 w-4" />,
                        className: 'text-blue-500 hover:bg-blue-50 hover:text-blue-600',
                        label: 'navigation',
                      };
                    case 'tab_change':
                      return {
                        icon: <Layers className="h-4 w-4" />,
                        className: 'text-amber-500 hover:bg-amber-50 hover:text-amber-600',
                        label: 'tab change',
                      };
                  }
                };

                const { icon, className, label } = getCollapsedIcon();

                return (
                  <Tooltip key={source.id}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={(e) => handleCreateStep(source, e)}
                        className={cn('h-8 w-8 transition-colors', className)}
                      >
                        {icon}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="left" className="text-xs">
                      Add {label} #{index + 1}
                    </TooltipContent>
                  </Tooltip>
                );
              })}
              {allSources.length > 8 && (
                <div className="flex h-8 w-8 items-center justify-center">
                  <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                    +{allSources.length - 8}
                  </Badge>
                </div>
              )}
            </div>
          </CardContent>
        )}
      </Card>
    </aside>
  );
}
