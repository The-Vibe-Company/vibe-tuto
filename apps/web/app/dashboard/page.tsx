'use client';

import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TutorialCard, TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { TutorialCardSkeleton } from '@/components/dashboard/TutorialCardSkeleton';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare' | 'onProcess'>;

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

  // Redirect to login on unauthorized error
  if (error?.message === 'UNAUTHORIZED') {
    router.push('/login');
    return null;
  }

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

  const processMutation = useMutation({
    mutationFn: async (tutorialId: string) => {
      const response = await fetch('/api/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tutorialId }),
      });
      if (!response.ok) {
        throw new Error('Failed to process tutorial');
      }
      const data = await response.json();
      return { tutorialId, status: data.status || 'ready' };
    },
    onSuccess: ({ tutorialId, status }) => {
      // Optimistically update the cache
      queryClient.setQueryData<Tutorial[]>(['tutorials'], (old) =>
        old?.map((t) => (t.id === tutorialId ? { ...t, status } : t)) ?? []
      );
    },
    onError: (err) => {
      console.error('Process error:', err);
    },
  });

  const handleEdit = (tutorialId: string) => {
    router.push(`/editor/${tutorialId}`);
  };

  const handleDelete = (tutorialId: string) => {
    deleteMutation.mutate(tutorialId);
  };

  const handleProcess = async (tutorialId: string) => {
    await processMutation.mutateAsync(tutorialId);
  };

  if (error && error.message !== 'UNAUTHORIZED') {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error.message}</p>
        <button
          onClick={() => refetch()}
          className="mt-4 text-sm text-violet-600 hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">Mes tutoriels</h1>
          <p className="mt-1 text-sm text-stone-500">
            Gérez et partagez vos tutoriels
          </p>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <TutorialCardSkeleton key={i} />
          ))}
        </div>
      ) : tutorials.length === 0 ? (
        <div className="rounded-xl bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-violet-100">
            <Plus className="h-6 w-6 text-violet-600" />
          </div>
          <h2 className="text-xl font-semibold text-stone-900">
            Aucun tutoriel
          </h2>
          <p className="mt-2 text-stone-500">
            Utilisez l'extension Chrome pour créer votre premier tutoriel.
          </p>
          <p className="mt-4 text-sm text-stone-400">
            Cliquez sur l'icône Vibe Tuto dans Chrome pour commencer
            l'enregistrement.
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {tutorials.map((tutorial) => (
            <TutorialCard
              key={tutorial.id}
              {...tutorial}
              onEdit={() => handleEdit(tutorial.id)}
              onDelete={() => handleDelete(tutorial.id)}
              onProcess={() => handleProcess(tutorial.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
