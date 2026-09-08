'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check, Loader2, Monitor, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export function DesktopConsent({ id, email, expired = false, claimed = false, alreadyApproved = false }: { id?: string; email?: string; expired?: boolean; claimed?: boolean; alreadyApproved?: boolean }) {
  const [approved, setApproved] = useState(alreadyApproved);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function approve() {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(`/api/desktop/connect/${id}/approve`, { method: 'POST' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Could not connect. Please try again.');
      setApproved(true);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Could not connect. Please try again.'); }
    finally { setBusy(false); }
  }
  return <main className="flex min-h-screen items-center justify-center bg-[#faf8f3] px-5 py-12 text-stone-900">
    <div className="w-full max-w-md">
      <Link href="/" className="mb-8 inline-block text-2xl font-semibold tracking-tight">captuto<span className="text-[#bd402d]">.</span></Link>
      <Card className="border-stone-200 bg-white shadow-sm">
        <CardHeader className="gap-3 p-7 pb-4">
          {approved ? <Check className="h-7 w-7 text-emerald-700" /> : <Monitor className="h-7 w-7 text-[#bd402d]" />}
          <CardTitle className="text-2xl tracking-tight">{expired ? 'This connection expired' : claimed ? 'Already connected' : approved ? 'Connection approved' : 'Connect Captuto for Mac'}</CardTitle>
          <CardDescription className="text-base leading-relaxed text-stone-600">{expired ? 'Return to Captuto on your Mac and choose Connect account to start again.' : claimed ? 'This request was approved with another account. Start a new connection from your Mac.' : approved ? 'Return to Captuto on your Mac to finish connecting. Your recordings will be saved to this account.' : 'Save recordings to your account and turn them into guides, without copying a token.'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5 p-7 pt-2">
          {email && <div className="rounded-lg bg-stone-50 px-4 py-3"><p className="text-xs text-stone-500">Connected account</p><p className="mt-1 break-all text-sm font-medium">{email}</p></div>}
          {!expired && !claimed && !approved && <>
            <p className="text-sm leading-relaxed text-stone-600">Approve only if you just started this connection from Captuto on your Mac. The app will be able to create and manage your tutorials. You can revoke access in Settings.</p>
            {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
            <Button onClick={approve} disabled={busy} className="h-11 w-full gap-2 bg-[#bd402d] text-white hover:bg-[#a53626]">{busy && <Loader2 className="h-4 w-4 animate-spin" />}{busy ? 'Connecting…' : 'Connect Captuto'}</Button>
          </>}
          <Button asChild variant="ghost" className="h-11 w-full gap-2"><Link href="/dashboard"><ArrowLeft className="h-4 w-4" />{approved ? 'Open dashboard' : 'Back to dashboard'}</Link></Button>
        </CardContent>
      </Card>
    </div>
  </main>;
}
