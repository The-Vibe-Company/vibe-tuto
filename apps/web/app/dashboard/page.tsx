'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, RefreshCw, ListOrdered, Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TutorialTableRow } from '@/components/dashboard/TutorialTableRow';
import { TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { KpiStrip } from '@/components/dashboard/KpiStrip';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare'>;

type TabKey = 'all' | 'published' | 'draft' | 'processing';
type SortKey = 'recent' | 'oldest' | 'title';

const sortLabels: Record<SortKey, string> = {
  recent: 'Recent',
  oldest: 'Oldest',
  title: 'Title',
};

async function fetchTutorials(): Promise<Tutorial[]> {
  const response = await fetch('/api/tutorials');
  if (!response.ok) {
    if (response.status === 401) throw new Error('UNAUTHORIZED');
    throw new Error('Failed to fetch tutorials');
  }
  const data = await response.json();
  return data.tutorials;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [sortOrder, setSortOrder] = useState<SortKey>('recent');

  const {
    data: tutorials = [],
    isLoading: loading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['tutorials'],
    queryFn: fetchTutorials,
  });

  const deleteMutation = useMutation({
    mutationFn: async (tutorialId: string) => {
      const response = await fetch(`/api/tutorials/${tutorialId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete tutorial');
      return tutorialId;
    },
    onSuccess: (deletedId) => {
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.filter((t) => t.id !== deletedId) ?? [],
      );
    },
  });

  const handleEdit = (tutorialId: string) => router.push(`/editor/${tutorialId}`);
  const handleDelete = (tutorialId: string) => deleteMutation.mutate(tutorialId);

  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') router.push('/login');
  }, [error, router]);

  const counts = useMemo(() => {
    const total = tutorials.length;
    const published = tutorials.filter(
      (t) => t.visibility === 'link_only' || t.visibility === 'public',
    ).length;
    const processing = tutorials.filter((t) => t.status === 'processing').length;
    const draft = total - published - processing;
    return { all: total, published, draft, processing };
  }, [tutorials]);

  const filtered = useMemo(() => {
    let list: Tutorial[];
    if (activeTab === 'all') {
      list = tutorials;
    } else if (activeTab === 'published') {
      list = tutorials.filter(
        (t) => t.visibility === 'link_only' || t.visibility === 'public',
      );
    } else if (activeTab === 'processing') {
      list = tutorials.filter((t) => t.status === 'processing');
    } else {
      list = tutorials.filter(
        (t) =>
          t.status !== 'processing' &&
          t.visibility !== 'link_only' &&
          t.visibility !== 'public',
      );
    }
    const sorted = [...list];
    if (sortOrder === 'recent') {
      sorted.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
    } else if (sortOrder === 'oldest') {
      sorted.sort((a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt));
    } else {
      sorted.sort((a, b) =>
        a.title.localeCompare(b.title, undefined, { sensitivity: 'base' }),
      );
    }
    return sorted;
  }, [activeTab, tutorials, sortOrder]);

  if (error?.message === 'UNAUTHORIZED') return null;

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Card className="border-red-100">
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <p className="mb-4 text-red-600">{error.message}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-6 py-8 lg:px-8">
      {/* Greeting */}
      <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-[28px] font-semibold leading-tight tracking-tight text-stone-900">
            Your tutorials,{' '}
            <span
              className="font-serif italic font-normal bg-clip-text text-transparent"
              style={{ backgroundImage: 'var(--brand-gradient)' }}
            >
              ready to share.
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-stone-500">
            {loading
              ? 'Loading…'
              : `${counts.all} ${counts.all === 1 ? 'tutorial' : 'tutorials'} · ${counts.published} published`}
          </p>
        </div>
      </div>

      {/* KPI strip */}
      <div className="mb-8">
        <KpiStrip tutorialsCount={counts.all} />
      </div>

      {/* Tab bar */}
      <div className="mb-3.5 flex flex-wrap items-center gap-1.5">
        {[
          { key: 'all' as const, label: 'All', count: counts.all },
          { key: 'published' as const, label: 'Published', count: counts.published },
          { key: 'draft' as const, label: 'Drafts', count: counts.draft },
          { key: 'processing' as const, label: 'Processing', count: counts.processing },
        ].map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                isActive
                  ? 'bg-stone-900 text-white'
                  : 'text-stone-500 hover:bg-stone-100 hover:text-stone-900'
              }`}
            >
              {tab.label}
              <span
                className={`font-mono text-[11px] ${
                  isActive ? 'text-white/65' : 'text-stone-400'
                }`}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-md border border-stone-200 bg-white px-3 py-1.5 text-[13px] font-medium text-stone-600 transition-colors hover:border-stone-300 hover:text-stone-900"
              >
                <ListOrdered className="h-3.5 w-3.5" />
                Sort: {sortLabels[sortOrder]}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setSortOrder('recent')}>
                Most recent
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortOrder('oldest')}>
                Oldest
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setSortOrder('title')}>
                Title (A–Z)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Table or empty state */}
      {loading ? (
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white">
          <div className="grid grid-cols-[42px_minmax(0,1.6fr)_120px_minmax(0,0.8fr)_minmax(0,0.6fr)_32px] gap-4 border-b border-stone-200/60 bg-stone-50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500">
            <span />
            <span>Tutorial</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Views</span>
            <span />
          </div>
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[42px_minmax(0,1.6fr)_120px_minmax(0,0.8fr)_minmax(0,0.6fr)_32px] items-center gap-4 border-b border-stone-200/60 px-5 py-3 last:border-b-0"
            >
              <div className="h-10 w-10 animate-pulse rounded-md bg-stone-100" />
              <div className="space-y-1.5">
                <div className="h-3 w-2/3 animate-pulse rounded bg-stone-100" />
                <div className="h-2 w-1/3 animate-pulse rounded bg-stone-100" />
              </div>
              <div className="h-5 w-20 animate-pulse rounded-full bg-stone-100" />
              <div className="h-3 w-16 animate-pulse rounded bg-stone-100" />
              <div className="h-3 w-12 animate-pulse rounded bg-stone-100" />
              <div />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="border-stone-200/60">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-brand-100 bg-brand-50">
              <Plus className="h-6 w-6 text-brand-600" />
            </div>
            <h2 className="font-heading text-xl font-semibold text-stone-900">
              {activeTab === 'all' ? 'No tutorials yet' : 'Nothing here'}
            </h2>
            <p className="mt-2 max-w-sm text-stone-500">
              {activeTab === 'all'
                ? 'Use the Chrome extension to create your first tutorial.'
                : 'No tutorials match this filter. Try another tab.'}
            </p>
            {activeTab === 'all' && (
              <p className="mt-4 text-sm text-stone-400">
                Click on the CapTuto icon in Chrome to start recording.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-stone-200/60 bg-white">
          <div className="grid grid-cols-[42px_minmax(0,1.6fr)_120px_minmax(0,0.8fr)_minmax(0,0.6fr)_32px] gap-4 border-b border-stone-200/60 bg-stone-50 px-5 py-3 font-mono text-[11px] uppercase tracking-[0.06em] text-stone-500">
            <span />
            <span>Tutorial</span>
            <span>Status</span>
            <span>Updated</span>
            <span>Views</span>
            <span />
          </div>
          <div className="divide-y divide-stone-200/60">
            {filtered.map((tutorial) => (
              <TutorialTableRow
                key={tutorial.id}
                {...tutorial}
                onEdit={() => handleEdit(tutorial.id)}
                onDelete={() => handleDelete(tutorial.id)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
