'use client';

import { useCallback, useState, useEffect } from 'react';
import { Copy, Check, ExternalLink, Link2, Globe, Lock, Code, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';
import { DownloadPdfButton } from '@/components/public/DownloadPdfButton';

type Visibility = 'private' | 'link_only' | 'public';

interface ShareSettings {
  success: boolean;
  visibility: Visibility;
  publicToken: string | null;
  tokenUrl: string | null;
  slugUrl: string | null;
  embedUrl: string | null;
}

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tutorialId: string;
  tutorialTitle: string;
  tutorialSlug: string | null;
}

export function ShareDialog({
  open,
  onOpenChange,
  tutorialId,
  tutorialTitle,
}: ShareDialogProps) {
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const fetchSettings = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setSettings(null);
    setError(null);
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}/share`, { signal });
      if (!response.ok) throw new Error('Sharing settings could not be saved or loaded. Please try again.');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      if (signal?.aborted) return;
      setError(error instanceof Error ? error.message : 'Could not load sharing settings.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [tutorialId]);

  // Fetch current share settings
  useEffect(() => {
    if (open && tutorialId) {
      const controller = new AbortController();
      fetchSettings(controller.signal);
      return () => controller.abort();
    }
  }, [fetchSettings, open, tutorialId]);

  const updateVisibility = async (visibility: Visibility) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });

      if (!response.ok) throw new Error('Sharing settings could not be saved or loaded. Please try again.');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not save sharing settings.');
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    } catch {
      // Fallback
      const input = document.createElement('input');
      input.value = text;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
    }
  };

  const getEmbedCode = () => {
    if (!settings?.embedUrl) return '';
    return `<iframe
  src="${settings.embedUrl}"
  width="100%"
  height="600"
  frameborder="0"
  allow="fullscreen"
  title="${tutorialTitle}"
></iframe>`;
  };

  const visibility = settings?.visibility || 'private';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Share tutorial</DialogTitle>
          <DialogDescription>
            Configure sharing options for &quot;{tutorialTitle}&quot;
          </DialogDescription>
        </DialogHeader>

        {error && <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{error}{!settings && <Button variant="ghost" size="sm" onClick={() => fetchSettings()}>Retry</Button>}</div>}
        <div className="flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50 p-4">
          <div><p className="text-sm font-medium">Take your guide with you</p><p className="mt-1 text-xs text-stone-600">Steps and annotated captures, ready to read.</p></div>
          <DownloadPdfButton url={`/api/tutorials/${tutorialId}/export/pdf`} title={tutorialTitle} />
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-stone-400" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Visibility Options */}
            <div className="space-y-3">
              <Label>Visibility</Label>
              <RadioGroup
                value={visibility}
                onValueChange={(value) => updateVisibility(value as Visibility)}
                disabled={saving || !settings}
                className="space-y-2"
              >
                {/* Private */}
                <label
                  htmlFor="visibility-private"
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    visibility === 'private'
                      ? 'border-[#bd402d] bg-orange-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  )}
                >
                  <RadioGroupItem value="private" id="visibility-private" />
                  <Lock className="h-4 w-4 text-stone-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Private</p>
                    <p className="text-xs text-stone-500">
                      Only you can see this tutorial
                    </p>
                  </div>
                </label>

                {/* Link Only */}
                <label
                  htmlFor="visibility-link"
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    visibility === 'link_only'
                      ? 'border-[#bd402d] bg-orange-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  )}
                >
                  <RadioGroupItem value="link_only" id="visibility-link" />
                  <Link2 className="h-4 w-4 text-stone-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Link only</p>
                    <p className="text-xs text-stone-500">
                      Anyone with the link can view
                    </p>
                  </div>
                </label>

                {/* Public */}
                <label
                  htmlFor="visibility-public"
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    visibility === 'public'
                      ? 'border-[#bd402d] bg-orange-50'
                      : 'border-stone-200 hover:bg-stone-50'
                  )}
                >
                  <RadioGroupItem
                    value="public"
                    id="visibility-public"
                  />
                  <Globe className="h-4 w-4 text-stone-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Public</p>
                    <p className="text-xs text-stone-500">
                      Anyone can discover and read this guide
                    </p>
                  </div>
                </label>
              </RadioGroup>
            </div>

            {/* Share Links (only show if not private) */}
            {visibility !== 'private' && settings?.tokenUrl && (
              <div className="space-y-3">
                <Label>Share links</Label>

                {/* Token URL */}
                <div className="space-y-1.5">
                  <p className="text-xs text-stone-500">Share link</p>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                      {settings.tokenUrl}
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Copy or open share link"
                      onClick={() => copyToClipboard(settings.tokenUrl!, 'token')}
                    >
                      {copiedField === 'token' ? (
                        <Check className="h-4 w-4 text-green-500" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      aria-label="Copy or open share link"
                      asChild
                    >
                      <a href={settings.tokenUrl} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  </div>
                </div>

                {/* Slug URL (if public) */}
                {visibility === 'public' && settings.slugUrl && (
                  <div className="space-y-1.5">
                    <p className="text-xs text-stone-500">Public URL (SEO)</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 truncate rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm">
                        {settings.slugUrl}
                      </div>
                      <Button
                        variant="outline"
                        size="icon"
                      aria-label="Copy or open share link"
                        onClick={() => copyToClipboard(settings.slugUrl!, 'slug')}
                      >
                        {copiedField === 'slug' ? (
                          <Check className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                      aria-label="Copy or open share link"
                        asChild
                      >
                        <a href={settings.slugUrl} target="_blank" rel="noopener noreferrer">
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Embed Code (only show if not private) */}
            {visibility !== 'private' && settings?.embedUrl && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2">
                    <Code className="h-4 w-4" />
                    Embed code
                  </Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1.5 text-xs"
                    onClick={() => copyToClipboard(getEmbedCode(), 'embed')}
                  >
                    {copiedField === 'embed' ? (
                      <>
                        <Check className="h-3 w-3 text-green-500" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
                <pre className="overflow-x-auto rounded-md border border-stone-200 bg-stone-900 p-3 text-xs text-stone-300">
                  {getEmbedCode()}
                </pre>
              </div>
            )}

            {/* Saving indicator */}
            {saving && (
              <div className="flex items-center justify-center gap-2 text-sm text-stone-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
