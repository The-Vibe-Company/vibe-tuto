import { beforeEach,describe,it,expect,vi } from 'vitest';
vi.mock('@/lib/auth/request',()=>({resolveRequestUser:vi.fn()}));
import {resolveRequestUser} from '@/lib/auth/request';
import {POST,GET} from './route';
const request=(method:string,params:unknown={},headers:Record<string,string>={})=>new Request('http://localhost:3678/api/mcp',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json, text/event-stream',Authorization:'Bearer fixture',...headers},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});
beforeEach(()=>{vi.resetAllMocks();vi.mocked(resolveRequestUser).mockResolvedValue({userId:'owner',supabase:{}} as never);});
describe('MCP HTTP protocol',()=>{
 it('initializes using the standard SDK transport',async()=>{
  const r=await POST(request('initialize',{protocolVersion:'2025-03-26',capabilities:{},clientInfo:{name:'test',version:'1'}}));
  expect(r.status).toBe(200);expect((await r.json()).result.serverInfo.name).toBe('captuto');
 });
 it('lists tools on a subsequent stateless request',async()=>{
  const r=await POST(request('tools/list'));const names=(await r.json()).result.tools.map((t:{name:string})=>t.name);
  expect(names).toContain('preview_step');expect(names).toContain('save_steps');expect(names).toContain('export_pdf');
 });
 it('rejects cross-origin browser invocations before authentication',async()=>{
  expect((await POST(request('tools/list',{}, {Origin:'https://attacker.invalid'}))).status).toBe(403);
  expect(resolveRequestUser).not.toHaveBeenCalled();
 });
 it('requires bearer credentials even for a signed-in browser',async()=>{
  expect((await POST(request('tools/list',{}, {Authorization:''}))).status).toBe(401);
  vi.mocked(resolveRequestUser).mockResolvedValue(null);
  expect((await POST(request('tools/list'))).status).toBe(401);
 });
 it('reports invalid annotation input as a tool error without touching storage',async()=>{
  const r=await POST(request('tools/call',{name:'save_steps',arguments:{tutorialId:crypto.randomUUID(),steps:[{id:crypto.randomUUID(),source_id:null,order_index:0,step_type:'text',text_content:'hi',annotations:[{id:'a',type:'rectangle',x:0.9,y:0,width:0.5,height:0.2}]}]}}));
  expect((await r.json()).result.isError).toBe(true);
 });
 it('does not open persistent server streams',()=>expect(GET().status).toBe(405));
});
