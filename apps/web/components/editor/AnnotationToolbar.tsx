'use client';

import { useState } from 'react';
import {
  Circle,
  ArrowRight,
  Type,
  Highlighter,
  EyeOff,
  Trash2,
  Check,
  Palette,
  Hash,
} from 'lucide-react';
import type { AnnotationType } from '@/lib/types/editor';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import {
  ANNOTATION_COLORS,
  STROKE_WIDTHS,
  FONT_SIZES,
  TEXT_BACKGROUNDS,
  DEFAULT_ANNOTATION_STYLE,
} from '@/lib/constants/annotation-styles';

export interface AnnotationStyle {
  color: string;
  strokeWidth: number;
  fontSize: number;
  opacity: number;
  textBackground: 'pill' | 'rectangle' | 'none';
}

interface AnnotationToolbarProps {
  activeTool: AnnotationType | null;
  onToolChange: (tool: AnnotationType | null) => void;
  onClearAll: () => void;
  onDone: () => void;
  hasAnnotations: boolean;
  annotationStyle?: AnnotationStyle;
  onStyleChange?: (style: AnnotationStyle) => void;
}

const TOOLS: { type: AnnotationType; icon: typeof Circle; label: string }[] = [
  { type: 'circle', icon: Circle, label: 'Circle' },
  { type: 'arrow', icon: ArrowRight, label: 'Arrow' },
  { type: 'text', icon: Type, label: 'Text' },
  { type: 'numbered-callout', icon: Hash, label: 'Callout' },
  { type: 'highlight', icon: Highlighter, label: 'Highlight' },
  { type: 'blur', icon: EyeOff, label: 'Blur' },
];

export function AnnotationToolbar({
  activeTool,
  onToolChange,
  onClearAll,
  onDone,
  hasAnnotations,
  annotationStyle,
  onStyleChange,
}: AnnotationToolbarProps) {
  const [localStyle, setLocalStyle] = useState<AnnotationStyle>({
    color: DEFAULT_ANNOTATION_STYLE.color,
    strokeWidth: DEFAULT_ANNOTATION_STYLE.strokeWidth,
    fontSize: DEFAULT_ANNOTATION_STYLE.fontSize,
    opacity: DEFAULT_ANNOTATION_STYLE.opacity,
    textBackground: DEFAULT_ANNOTATION_STYLE.textBackground,
  });

  const style = annotationStyle || localStyle;
  const updateStyle = (updates: Partial<AnnotationStyle>) => {
    const newStyle = { ...style, ...updates };
    if (onStyleChange) {
      onStyleChange(newStyle);
    } else {
      setLocalStyle(newStyle);
    }
  };

  const showTextOptions = activeTool === 'text' || activeTool === 'numbered-callout';
  const showHighlightOptions = activeTool === 'highlight';
  const showStrokeOptions =
    activeTool === 'circle' || activeTool === 'arrow' || activeTool === 'numbered-callout';

  return (
    <div className="flex items-center gap-1 rounded-xl border border-border/50 bg-background/80 p-1.5 shadow-xl shadow-black/10 backdrop-blur-xl">
      {/* Drawing Tools */}
      <div className="flex items-center gap-0.5">
        {TOOLS.map(({ type, icon: Icon, label }) => (
          <Tooltip key={type}>
            <TooltipTrigger asChild>
              <Toggle
                pressed={activeTool === type}
                onPressedChange={() =>
                  onToolChange(activeTool === type ? null : type)
                }
                className={cn(
                  'relative h-8 w-8 rounded-lg p-0 transition-all duration-150',
                  'hover:bg-muted/80',
                  activeTool === type && 'bg-primary/10 text-primary shadow-sm'
                )}
              >
                <Icon className="h-4 w-4" />
                {/* Active color indicator dot */}
                {activeTool === type && (
                  <span
                    className="absolute -bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full"
                    style={{ backgroundColor: style.color }}
                  />
                )}
              </Toggle>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {label}
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      {/* Separator */}
      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Style Options */}
      <div className="flex items-center gap-0.5">
        {/* Color Picker */}
        <Popover>
          <Tooltip>
            <TooltipTrigger asChild>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 rounded-lg p-0 hover:bg-muted/80"
                >
                  <div className="flex items-center justify-center">
                    <div
                      className="h-4 w-4 rounded-full border border-black/10 shadow-sm transition-colors"
                      style={{ backgroundColor: style.color }}
                    />
                  </div>
                </Button>
              </PopoverTrigger>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              Color
            </TooltipContent>
          </Tooltip>
          <PopoverContent
            side="bottom"
            align="start"
            className="w-auto rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
          >
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                Color
              </p>
              <div className="flex gap-1.5">
                {ANNOTATION_COLORS.map((c) => (
                  <button
                    key={c.value}
                    onClick={() => updateStyle({ color: c.value })}
                    className={cn(
                      'h-6 w-6 rounded-full border-2 transition-all duration-150 hover:scale-110',
                      style.color === c.value
                        ? 'border-foreground shadow-md'
                        : 'border-transparent hover:border-muted-foreground/30'
                    )}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                ))}
              </div>
            </div>
          </PopoverContent>
        </Popover>

        {/* Stroke Width (for circle, arrow, callout) */}
        {showStrokeOptions && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0 hover:bg-muted/80"
                  >
                    <div className="flex items-center gap-0.5">
                      {STROKE_WIDTHS.map((s) => (
                        <div
                          key={s.value}
                          className={cn(
                            'rounded-full transition-colors',
                            style.strokeWidth === s.value
                              ? 'bg-foreground'
                              : 'bg-muted-foreground/40'
                          )}
                          style={{
                            width: s.px + 1,
                            height: s.px + 1,
                          }}
                        />
                      ))}
                    </div>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Stroke Width
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-auto rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Stroke
                </p>
                <div className="flex gap-2">
                  {STROKE_WIDTHS.map((s) => (
                    <button
                      key={s.value}
                      onClick={() => updateStyle({ strokeWidth: s.value })}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-150',
                        style.strokeWidth === s.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-muted-foreground/50 hover:bg-muted/50'
                      )}
                    >
                      <div
                        className="rounded-full bg-foreground"
                        style={{
                          width: s.px * 2,
                          height: s.px * 2,
                        }}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Font Size (for text and callout) */}
        {showTextOptions && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-0.5 rounded-lg px-1.5 text-[11px] font-medium hover:bg-muted/80"
                  >
                    <Type className="h-3 w-3" />
                    <span>{style.fontSize}</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Font Size
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-auto rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Font Size
                </p>
                <div className="flex gap-1.5">
                  {FONT_SIZES.map((f) => (
                    <button
                      key={f.value}
                      onClick={() => updateStyle({ fontSize: f.value })}
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg border text-xs font-medium transition-all duration-150',
                        style.fontSize === f.value
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50'
                      )}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Text Background Style (for text) */}
        {activeTool === 'text' && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 rounded-lg p-0 hover:bg-muted/80"
                  >
                    <div
                      className={cn(
                        'flex h-4 w-4 items-center justify-center text-[8px] font-bold',
                        style.textBackground === 'pill' && 'rounded-full bg-muted',
                        style.textBackground === 'rectangle' && 'rounded-[2px] bg-muted',
                        style.textBackground === 'none' && 'text-muted-foreground'
                      )}
                    >
                      A
                    </div>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Text Background
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-auto rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex flex-col gap-2">
                <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Background
                </p>
                <div className="flex gap-1.5">
                  {TEXT_BACKGROUNDS.map((bg) => (
                    <button
                      key={bg}
                      onClick={() => updateStyle({ textBackground: bg })}
                      className={cn(
                        'flex h-8 items-center justify-center rounded-lg border px-2.5 text-[11px] font-medium capitalize transition-all duration-150',
                        style.textBackground === bg
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50 hover:bg-muted/50'
                      )}
                    >
                      {bg}
                    </button>
                  ))}
                </div>
              </div>
            </PopoverContent>
          </Popover>
        )}

        {/* Opacity Slider (for highlights) */}
        {showHighlightOptions && (
          <Popover>
            <Tooltip>
              <TooltipTrigger asChild>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 rounded-lg px-1.5 text-[11px] font-medium hover:bg-muted/80"
                  >
                    <Palette className="h-3 w-3" />
                    <span>{Math.round(style.opacity * 100)}%</span>
                  </Button>
                </PopoverTrigger>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">
                Highlight Opacity
              </TooltipContent>
            </Tooltip>
            <PopoverContent
              side="bottom"
              align="center"
              className="w-48 rounded-xl border-border/50 bg-background/95 p-3 shadow-xl backdrop-blur-xl"
            >
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Opacity
                  </p>
                  <span className="text-xs font-medium tabular-nums text-foreground">
                    {Math.round(style.opacity * 100)}%
                  </span>
                </div>
                <Slider
                  value={[style.opacity * 100]}
                  onValueChange={(value) =>
                    updateStyle({ opacity: value[0] / 100 })
                  }
                  min={10}
                  max={80}
                  step={5}
                  className="w-full"
                />
              </div>
            </PopoverContent>
          </Popover>
        )}
      </div>

      {/* Separator */}
      <Separator orientation="vertical" className="mx-1 h-6" />

      {/* Actions */}
      <div className="flex items-center gap-0.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClearAll}
              disabled={!hasAnnotations}
              className={cn(
                'h-8 w-8 rounded-lg p-0 transition-all duration-150',
                hasAnnotations
                  ? 'text-destructive hover:bg-destructive/10 hover:text-destructive'
                  : 'text-muted-foreground/50'
              )}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="text-xs">
            Clear all annotations
          </TooltipContent>
        </Tooltip>

        <Button
          size="sm"
          onClick={onDone}
          className="ml-0.5 h-8 gap-1 rounded-lg px-3 text-xs font-medium shadow-sm"
        >
          <Check className="h-3.5 w-3.5" />
          Done
        </Button>
      </div>
    </div>
  );
}
