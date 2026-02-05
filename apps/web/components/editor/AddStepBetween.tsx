'use client';

import { useState } from 'react';
import { Plus, FileText, Heading, Minus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import type { NewStepType } from './DocEditor';

interface AddStepBetweenProps {
  onAddStep: (type: NewStepType) => void;
}

export type AddStepCallback = (type: NewStepType, afterStepId?: string | null) => void;

const stepOptions: { type: NewStepType; icon: typeof FileText; label: string; description: string }[] = [
  { type: 'text', icon: FileText, label: 'Text', description: 'Add a description' },
  { type: 'heading', icon: Heading, label: 'Heading', description: 'Create a section' },
  { type: 'divider', icon: Minus, label: 'Divider', description: 'Separate steps' },
];

export function AddStepBetween({ onAddStep }: AddStepBetweenProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative flex h-8 items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dashed line that becomes visible on hover */}
      <div
        className={cn(
          'absolute inset-x-0 h-px border-t border-dashed transition-all duration-200',
          isHovered || isOpen ? 'border-primary/40' : 'border-transparent'
        )}
      />

      {/* Center button with dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'relative z-10 h-7 w-7 rounded-full border-dashed transition-all duration-200',
              isHovered || isOpen
                ? 'scale-100 border-primary bg-primary/5 text-primary opacity-100 hover:bg-primary/10'
                : 'scale-75 border-border text-muted-foreground opacity-0'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" className="min-w-[180px]">
          {stepOptions.map(({ type, icon: Icon, label, description }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onAddStep(type)}
              className="flex items-start gap-3 py-2"
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col">
                <span className="font-medium">{label}</span>
                <span className="text-xs text-muted-foreground">{description}</span>
              </div>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
