'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Bell, Globe, Plus, LogOut, Settings, HelpCircle, ExternalLink, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface DashboardTopBarProps {
  userEmail: string;
}

export function DashboardTopBar({ userEmail }: DashboardTopBarProps) {
  const router = useRouter();
  const initials = userEmail.split('@')[0].slice(0, 2).toUpperCase();

  const handleLogout = async () => {
    const supabase = createClient();
    if (typeof window !== 'undefined') {
      window.postMessage(
        { type: 'CAPTUTO_AUTH', authToken: null, userEmail: null },
        '*',
      );
    }
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center gap-4 border-b border-stone-200/60 bg-white/85 px-6 backdrop-blur-xl backdrop-saturate-150">
      {/* Search */}
      <div className="flex max-w-md flex-1 items-center gap-2.5 rounded-[9px] border border-transparent bg-stone-100 px-3.5 py-2 transition-all focus-within:border-brand-300 focus-within:bg-white focus-within:shadow-[var(--ring-brand)]">
        <Search className="h-3.5 w-3.5 flex-shrink-0 text-stone-400" />
        <input
          type="search"
          placeholder="Search tutorials, steps, transcripts…"
          className="min-w-0 flex-1 bg-transparent text-[13px] text-stone-900 placeholder:text-stone-400 focus:outline-none"
        />
        <kbd className="hidden rounded border border-stone-200 bg-white px-1.5 py-0.5 font-mono text-[10px] text-stone-500 sm:block">
          ⌘K
        </kbd>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          aria-label="Notifications"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <Bell className="h-4 w-4" strokeWidth={2} />
        </button>
        <button
          type="button"
          aria-label="Language"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-500 transition-colors hover:bg-stone-100 hover:text-stone-900"
        >
          <Globe className="h-4 w-4" strokeWidth={2} />
        </button>

        <Button
          type="button"
          className="ml-2 cursor-pointer h-9 gap-2 bg-brand-600 px-3.5 text-[13px] font-medium text-white shadow-brand hover:bg-brand-500 hover:shadow-brand-lg"
        >
          <Plus className="h-4 w-4" strokeWidth={2.4} />
          New recording
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="ml-1 h-9 w-9 rounded-full p-0">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-brand-100 text-brand-700 font-heading text-xs">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-stone-900">Mon compte</p>
                <p className="truncate text-xs text-stone-500">{userEmail}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard" className="flex items-center">
                <LayoutDashboard className="mr-2 h-4 w-4" />
                Dashboard
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center">
                <Settings className="mr-2 h-4 w-4" />
                Paramètres
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a
                href="https://vibetuto.notion.site/Centre-d-aide"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center"
              >
                <HelpCircle className="mr-2 h-4 w-4" />
                Centre d&apos;aide
                <ExternalLink className="ml-auto h-3 w-3 text-stone-400" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se déconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
