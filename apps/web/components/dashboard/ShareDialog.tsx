'use client';

import { useState, useEffect } from 'react';
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
  tutorialSlug,
}: ShareDialogProps) {
  const [settings, setSettings] = useState<ShareSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Fetch current share settings
  useEffect(() => {
    if (open && tutorialId) {
      fetchSettings();
    }
  }, [open, tutorialId]);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}/share`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to fetch share settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateVisibility = async (visibility: Visibility) => {
    setSaving(true);
    try {
      const response = await fetch(`/api/tutorials/${tutorialId}/share`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility }),
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Failed to update visibility:', error);
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
                disabled={saving}
                className="space-y-2"
              >
                {/* Private */}
                <label
                  htmlFor="visibility-private"
                  className={cn(
                    'flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors',
                    visibility === 'private'
                      ? 'border-violet-500 bg-violet-50'
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
                      ? 'border-violet-500 bg-violet-50'
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
                      ? 'border-violet-500 bg-violet-50'
                      : 'border-stone-200 hover:bg-stone-50',
                    !tutorialSlug && 'cursor-not-allowed opacity-50'
                  )}
                >
                  <RadioGroupItem
                    value="public"
                    id="visibility-public"
                    disabled={!tutorialSlug}
                  />
                  <Globe className="h-4 w-4 text-stone-500" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Public</p>
                    <p className="text-xs text-stone-500">
                      {tutorialSlug
                        ? 'Accessible via custom URL'
                        : 'Requires a slug to be public'}
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
