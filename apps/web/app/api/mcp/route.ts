import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js';
import { resolveRequestUser } from '@/lib/auth/request';
import { createTutorialMcp } from '@/lib/agent/mcp';
import { transcribeTutorial } from '@/lib/agent/transcription';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function POST(request: Request) {
  const origin = new URL(request.url).origin;
  const suppliedOrigin = request.headers.get('origin');
  if (suppliedOrigin && suppliedOrigin !== origin && suppliedOrigin !== process.env.NEXT_PUBLIC_APP_URL) {
    return Response.json({error:'Origin not allowed'}, {status:403});
  }
  // MCP always uses a revocable API token; browser cookies alone cannot invoke tools.
  if (!request.headers.get('authorization')?.startsWith('Bearer ')) return Response.json({error:'API token required'}, {status:401});
  const auth = await resolveRequestUser(request);
  if (!auth) return Response.json({error:'Invalid API token'}, {status:401});
  const server = createTutorialMcp(auth, origin, id => transcribeTutorial(auth,id));
  const transport = new WebStandardStreamableHTTPServerTransport({sessionIdGenerator:undefined,enableJsonResponse:true});
  try {
    await server.connect(transport);
    return await transport.handleRequest(request);
  } finally { await server.close(); }
}

export function GET() { return new Response(null,{status:405,headers:{Allow:'POST'}}); }
export function DELETE() { return new Response(null,{status:405,headers:{Allow:'POST'}}); }
