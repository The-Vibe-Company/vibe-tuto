'use client';

import { useState } from 'react';
import { Download, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function DownloadPdfButton({ url, title }: { url: string; title: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function download() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error('The PDF could not be created. Please try again.');
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = `${title.replace(/[^\p{L}\p{N}\s_-]/gu, '').slice(0, 100) || 'tutorial'}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Download failed. Please try again.');
    } finally { setBusy(false); }
  }
  return <div className="flex flex-col items-start gap-2">
    <Button variant="outline" className="min-h-11 gap-2" onClick={download} disabled={busy}>
      {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
      {busy ? 'Preparing PDF…' : 'Download PDF'}
    </Button>
    {error && <p role="alert" className="max-w-xs text-sm text-red-700">{error}</p>}
  </div>;
}
