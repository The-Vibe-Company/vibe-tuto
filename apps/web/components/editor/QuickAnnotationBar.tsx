'use client';

import { Circle, MoveRight, Type, MoreHorizontal, Highlighter, EyeOff, Hash } from 'lucide-react';
import type { AnnotationType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import { DEFAULT_ANNOTATION_STYLE } from '@/lib/constants/annotation-styles';

interface QuickAnnotationBarProps {
  onToolSelect: (tool: AnnotationType) => void;
  className?: string;
}

const QUICK_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'arrow', icon: MoveRight, label: 'Arrow' },
  { type: 'text', icon: Type, label: 'Text' },
];

const MORE_TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'numbered-callout', icon: Hash, label: 'Numbered Callout' },
  { type: 'highlight', icon: Highlighter, label: 'Highlight' },
  { type: 'blur', icon: EyeOff, label: 'Blur' },
];

export function QuickAnnotationBar({ onToolSelect, className }: QuickAnnotationBarProps) {
  return (
    <div
      className={cn(
        'flex items-center gap-0.5 rounded-xl border border-border/50 bg-background/80 p-1 shadow-lg shadow-black/5 backdrop-blur-xl',
        'animate-in fade-in slide-in-from-bottom-1 duration-200',
        className
      )}
    >
      {QUICK_TOOLS.map(({ type, icon: Icon, label }) => (
        <Tooltip key={type}>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToolSelect(type)}
              className="relative h-7 w-7 rounded-lg transition-all duration-150 hover:bg-primary/10 hover:text-primary"
            >
              <Icon className="h-3.5 w-3.5" />
              {/* Color indicator dot */}
              <span
                className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full border border-background"
                style={{ backgroundColor: DEFAULT_ANNOTATION_STYLE.color }}
              />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            {label}
          </TooltipContent>
        </Tooltip>
      ))}

      <DropdownMenu>
        <Tooltip>
          <TooltipTrigger asChild>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg transition-all duration-150 hover:bg-muted"
              >
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
          </TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            More tools
          </TooltipContent>
        </Tooltip>
        <DropdownMenuContent
          align="start"
          className="min-w-[140px] rounded-xl border-border/50 bg-background/95 shadow-xl backdrop-blur-xl"
        >
          {MORE_TOOLS.map(({ type, icon: Icon, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onToolSelect(type)}
              className="gap-2 rounded-lg text-sm"
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
