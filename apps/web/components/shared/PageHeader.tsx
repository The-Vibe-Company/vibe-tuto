'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  actions?: React.ReactNode;
}

export function PageHeader({ breadcrumbs, actions }: PageHeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-stone-200/60 bg-white/85 backdrop-blur-xl backdrop-saturate-150">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-6">
        {/* Breadcrumb navigation */}
        <nav className="flex items-center gap-1.5 font-sans text-[13px]">
          <Link href="/dashboard" className="mr-1 flex items-center" aria-label="Home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/captuto-mark.svg" alt="" className="h-6 w-6 rounded-md" />
          </Link>
          {breadcrumbs.map((item, index) => {
            const isLast = index === breadcrumbs.length - 1;
            return (
              <div key={index} className="flex items-center gap-1.5">
                {index > 0 && (
                  <span className="font-mono text-stone-300">/</span>
                )}
                {item.href && !isLast ? (
                  <Link
                    href={item.href}
                    className="text-stone-500 transition-colors hover:text-stone-900"
                  >
                    {item.label}
                  </Link>
                ) : (
                  <span
                    className={
                      isLast
                        ? 'truncate max-w-[260px] font-semibold text-stone-900'
                        : 'text-stone-500'
                    }
                  >
                    {item.label}
                  </span>
                )}
              </div>
            );
          })}
        </nav>

        {/* Right side actions */}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
