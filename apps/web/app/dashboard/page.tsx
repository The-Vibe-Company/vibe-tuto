'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Plus } from 'lucide-react';
import { TutorialCard, TutorialCardProps } from '@/components/dashboard/TutorialCard';
import { TutorialCardSkeleton } from '@/components/dashboard/TutorialCardSkeleton';

type Tutorial = Omit<TutorialCardProps, 'onEdit' | 'onDelete' | 'onShare' | 'onProcess'>;

export default function DashboardPage() {
  const router = useRouter();
  const [tutorials, setTutorials] = useState<Tutorial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTutorials = useCallback(async () => {
    try {
      const response = await fetch('/api/tutorials');

      if (!response.ok) {
        if (response.status === 401) {
          router.push('/login');
          return;
        }
        throw new Error('Failed to fetch tutorials');
      }

      const data = await response.json();
      setTutorials(data.tutorials);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchTutorials();
  }, [fetchTutorials]);

  const handleEdit = (tutorialId: string) => {
    router.push(`/editor/${tutorialId}`);
  };

  const handleDelete = async (tutorialId: string) => {
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete tutorial');
      }

      // Remove from local state
      setTutorials((prev) => prev.filter((t) => t.id !== tutorialId));
    } catch (err) {
      console.error('Delete error:', err);
      // Could show a toast notification here
    }
  };

  const handleProcess = async (tutorialId: string) => {
    try {
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
      
      // Update local state
      setTutorials((prev) =>
        prev.map((t) =>
          t.id === tutorialId ? { ...t, status: data.status || 'ready' } : t
        )
      );
    } catch (err) {
      console.error('Process error:', err);
      // Could show a toast notification here
    }
  };

  if (error) {
    return (
      <div className="rounded-xl bg-white p-8 text-center shadow-sm">
        <p className="text-red-600">{error}</p>
        <button
          onClick={() => {
            setError(null);
            setLoading(true);
            fetchTutorials();
          }}
          className="mt-4 text-sm text-blue-600 hover:underline"
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
          <h1 className="text-2xl font-bold text-gray-900">Mes tutoriels</h1>
          <p className="mt-1 text-sm text-gray-500">
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
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Plus className="h-6 w-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">
            Aucun tutoriel
          </h2>
          <p className="mt-2 text-gray-500">
            Utilisez l'extension Chrome pour créer votre premier tutoriel.
          </p>
          <p className="mt-4 text-sm text-gray-400">
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
