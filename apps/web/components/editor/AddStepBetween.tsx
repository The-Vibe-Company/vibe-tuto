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

  const visible = isHovered || isOpen;

  return (
    <div
      className="group relative flex h-6 items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Thin line that appears on hover */}
      <div
        className={cn(
          'absolute inset-x-8 h-px transition-all duration-200',
          visible
            ? 'bg-gradient-to-r from-transparent via-border to-transparent'
            : 'bg-transparent'
        )}
      />

      {/* Center button with dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className={cn(
              'relative z-10 h-6 w-6 rounded-full border transition-all duration-200',
              visible
                ? 'scale-100 border-primary/40 bg-primary/5 text-primary opacity-100 hover:bg-primary/10 hover:border-primary'
                : 'scale-75 border-transparent text-muted-foreground opacity-0'
            )}
          >
            <Plus className="h-3 w-3" />
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
