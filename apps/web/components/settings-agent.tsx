'use client';
import { useEffect, useState } from 'react';
import { Copy, Check, Monitor, Terminal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';

export function AgentConnection() {
  const [origin,setOrigin] = useState('');
  const [copied,setCopied] = useState(false);
  const [error,setError] = useState('');
  useEffect(() => setOrigin(window.location.origin),[]);
  const command = `codex mcp add captuto --url ${origin}/api/mcp --bearer-token-env-var CAPTUTO_API_TOKEN`;
  return <Card className="mb-6 border-stone-200 bg-stone-50/50">
    <CardHeader><CardTitle className="flex items-center gap-2"><Monitor className="h-5 w-5"/> Record once. Shape it with your agent.</CardTitle>
      <CardDescription>Record your workflow with Captuto for Mac, then ask your agent to turn it into a guide.</CardDescription></CardHeader>
    <CardContent className="space-y-4 text-sm">
      <ol className="list-decimal space-y-2 pl-5 text-stone-700"><li>In Captuto for Mac, open Settings and enter this website address: <span className="font-medium">{origin}</span>.</li>
        <li>In the recorder, select Connect and authorize Captuto in your browser. The Mac app connects automatically.</li>
        <li>For your agent, create an API token below and set it as <code>CAPTUTO_API_TOKEN</code> in your agent’s environment.</li>
        <li>Connect Codex with the command below. Other MCP clients can use the same endpoint and bearer token.</li></ol>
      <div className="flex items-start gap-2 rounded-lg bg-white p-3 ring-1 ring-stone-200"><Terminal className="mt-1 h-4 w-4 shrink-0"/><code className="min-w-0 flex-1 break-all text-xs leading-6">{command}</code>
        <Button variant="ghost" size="icon" aria-label="Copy MCP connection command" onClick={async()=>{try{await navigator.clipboard.writeText(command);setCopied(true);setError('');}catch{setError('Could not copy. Select the command and copy it manually.');}}}>{copied?<Check className="h-4 w-4"/>:<Copy className="h-4 w-4"/>}</Button></div>
      {error && <p role="alert" className="text-red-700">{error}</p>}
      <p className="rounded-lg border-l-2 border-orange-600 bg-white p-4 text-stone-700">“From my Companion demo, create a guide for a new colleague. Annotate the screenshots, inspect your previews and refine the result.”</p>
    </CardContent>
  </Card>;
}
