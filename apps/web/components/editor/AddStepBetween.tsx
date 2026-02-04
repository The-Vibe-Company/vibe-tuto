'use client';

import { useState } from 'react';
import { Plus, FileText, Heading, Minus } from 'lucide-react';
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

// Type for the parent component callback
export type AddStepCallback = (type: NewStepType, afterStepId?: string | null) => void;

const stepOptions: { type: NewStepType; icon: typeof FileText; label: string }[] = [
  { type: 'text', icon: FileText, label: 'Texte' },
  { type: 'heading', icon: Heading, label: 'Titre' },
  { type: 'divider', icon: Minus, label: 'Séparateur' },
];

export function AddStepBetween({ onAddStep }: AddStepBetweenProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div
      className="group relative flex h-6 items-center justify-center"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Dashed line that becomes visible on hover */}
      <div
        className={cn(
          'absolute inset-x-0 h-px border-t border-dashed transition-all duration-200',
          isHovered || isOpen ? 'border-violet-300' : 'border-transparent'
        )}
      />

      {/* Center button with dropdown */}
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={cn(
              'relative z-10 flex h-6 w-6 items-center justify-center rounded-full border bg-white shadow-sm transition-all duration-200',
              isHovered || isOpen
                ? 'scale-100 border-violet-400 text-violet-600 opacity-100'
                : 'scale-75 border-slate-200 text-slate-400 opacity-0'
            )}
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="center" side="bottom" className="min-w-[140px]">
          {stepOptions.map(({ type, icon: Icon, label }) => (
            <DropdownMenuItem
              key={type}
              onClick={() => onAddStep(type)}
              className="cursor-pointer"
            >
              <Icon className="mr-2 h-4 w-4" />
              <span>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
