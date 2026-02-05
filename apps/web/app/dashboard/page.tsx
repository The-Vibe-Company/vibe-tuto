'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, AlertCircle, RefreshCw } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TutorialCard, TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { TutorialCardSkeleton } from '@/components/dashboard/TutorialCardSkeleton';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/shared/PageHeader';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare'>;

async function fetchTutorials(): Promise<Tutorial[]> {
  const response = await fetch('/api/tutorials');
  if (!response.ok) {
    if (response.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error('Failed to fetch tutorials');
  }
  const data = await response.json();
  return data.tutorials;
}

export default function DashboardPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

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
      if (!response.ok) {
        throw new Error('Failed to delete tutorial');
      }
      return tutorialId;
    },
    onSuccess: (deletedId) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.filter((t) => t.id !== deletedId) ?? []
      );
    },
    onError: (err) => {
      console.error('Delete error:', err);
    },
  });

  const handleEdit = (tutorialId: string) => {
    router.push(`/editor/${tutorialId}`);
  };

  const handleDelete = (tutorialId: string) => {
    deleteMutation.mutate(tutorialId);
  };

  // Redirect to login on unauthorized error
  useEffect(() => {
    if (error?.message === 'UNAUTHORIZED') {
      router.push('/login');
    }
  }, [error, router]);

  // Show nothing while redirecting to login
  if (error?.message === 'UNAUTHORIZED') {
    return null;
  }

  if (error) {
    return (
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
            Reessayer
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <PageHeader
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Mes tutoriels' },
        ]}
      />

      <div className="mx-auto max-w-6xl px-6 py-8">
      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TutorialCardSkeleton key={i} />
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8 text-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
              <Plus className="h-6 w-6 text-violet-600" />
            </div>
            <h2 className="text-xl font-semibold text-stone-900">
              Aucun tutoriel
            </h2>
            <p className="mt-2 text-stone-500">
              Utilisez l&apos;extension Chrome pour creer votre premier tutoriel.
            </p>
            <p className="mt-4 text-sm text-stone-400">
              Cliquez sur l&apos;icone Vibe Tuto dans Chrome pour commencer
              l&apos;enregistrement.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              {...tutorial}
              onEdit={() => handleEdit(tutorial.id)}
              onDelete={() => handleDelete(tutorial.id)}
            />
          ))}
        </div>
      )}
      </div>
    </>
  );
}
