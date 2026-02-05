'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { LayoutDashboard, Settings, HelpCircle, LogOut, ExternalLink, Play } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  userEmail: string;
}

export function Header({ userEmail }: HeaderProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    // Clear extension auth
    if (typeof window !== 'undefined') {
      window.postMessage(
        { type: 'CAPTUTO_AUTH', authToken: null, userEmail: null },
        '*'
      );
    }

    await supabase.auth.signOut();
    router.push('/login');
  };

  // Get initials from email
  const initials = userEmail
    .split('@')[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <header className="sticky top-0 z-50 border-b border-stone-100 bg-white/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        {/* Logo */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-violet-600 shadow-sm">
            <Play className="h-4 w-4 fill-white text-white" />
          </div>
          <span className="text-lg font-semibold tracking-tight text-stone-900">CapTuto</span>
          <span className="ml-1 rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-600">
            Beta
          </span>
        </Link>

        {/* User Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-violet-100 text-violet-600">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-stone-900">Mon compte</p>
                <p className="text-xs text-stone-500 truncate">{userEmail}</p>
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
                Parametres
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
                Centre d'aide
                <ExternalLink className="ml-auto h-3 w-3 text-stone-400" />
              </a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-red-600 focus:text-red-600"
            >
              <LogOut className="mr-2 h-4 w-4" />
              Se deconnecter
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
