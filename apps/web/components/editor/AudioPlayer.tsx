'use client';

interface AudioPlayerProps {
  audioUrl: string | null;
}

export function AudioPlayer({ audioUrl }: AudioPlayerProps) {
  if (!audioUrl) {
    return (
      <div className="flex items-center justify-center rounded-lg bg-gray-100 p-3 text-sm text-gray-500">
        Pas d'audio disponible
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-gray-100 p-3">
      <audio controls className="w-full" src={audioUrl}>
        Votre navigateur ne supporte pas l'audio.
      </audio>
    </div>
  );
}
