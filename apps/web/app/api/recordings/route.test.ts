import { beforeEach,describe,it,expect,vi } from 'vitest';
vi.mock('@/lib/auth/request',()=>({resolveRequestUser:vi.fn()}));
import {resolveRequestUser} from '@/lib/auth/request';
import {POST} from './route';
const id='11111111-1111-4111-a111-111111111111';
const payload={recording:{client_id:id,duration:3,started_at:'2026-09-08T00:00:00Z'},steps:[{timestamp:0,action_type:'click',screenshot_key:'a.jpg',screenshot_data:'aGVsbG8=',viewport_width:1000,viewport_height:500,click_x:0.2,click_y:0.4}]};
const request=(body:unknown)=>new Request('http://localhost/api/recordings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
function auth(options:{existing?:unknown;uploadError?:unknown;sourceError?:unknown;createError?:unknown}={}){
 const insert=vi.fn().mockResolvedValue({error:options.createError??null});
 const upsert=vi.fn().mockResolvedValue({error:options.sourceError??null});
 const upload=vi.fn().mockResolvedValue({error:options.uploadError??null});
 const from=vi.fn((table:string)=> table==='tutorials'?{select:()=>({eq:()=>({maybeSingle:async()=>({data:options.existing??null,error:null})})}),insert}:{upsert});
 vi.mocked(resolveRequestUser).mockResolvedValue({userId:'owner',supabase:{from,storage:{from:()=>({upload})}}} as never);
 return {insert,upsert,upload};
}
beforeEach(()=>vi.resetAllMocks());
describe('human recording ingestion',()=>{
 it('requires authentication',async()=>{vi.mocked(resolveRequestUser).mockResolvedValue(null);expect((await POST(request(payload))).status).toBe(401);});
 it('rejects malformed JSON and incomplete recordings',async()=>{
  auth();expect((await POST(new Request('http://localhost',{method:'POST',body:'{'}))).status).toBe(400);
  for(const body of [{},{...payload,steps:[]},{...payload,recording:{...payload.recording,duration:-1}}])expect((await POST(request(body))).status).toBe(400);
 });
 it('stores sources and returns the stable client recording ID',async()=>{
  const db=auth();const r=await POST(request(payload));expect(r.status).toBe(200);expect((await r.json()).tutorialId).toBe(id);
  expect(db.insert).toHaveBeenCalledWith(expect.objectContaining({title:'Desktop recording',user_id:'owner'}));
  expect(db.upsert).toHaveBeenCalledWith([expect.objectContaining({click_x:200,click_y:200,tutorial_id:id})],{onConflict:'id'});
 });
 it('retries the same recording without creating a second tutorial',async()=>{
  const db=auth({existing:{id,user_id:'owner'}});expect((await POST(request(payload))).status).toBe(200);expect(db.insert).not.toHaveBeenCalled();
 });
 it('cannot overwrite another owner recording',async()=>{
  const db=auth({existing:{id,user_id:'someone-else'}});expect((await POST(request(payload))).status).toBe(409);expect(db.upload).not.toHaveBeenCalled();expect(db.upsert).not.toHaveBeenCalled();
 });
 it('never reports success after a failed screenshot upload',async()=>{
  const db=auth({uploadError:{message:'offline'}});expect((await POST(request(payload))).status).toBe(500);expect(db.upsert).not.toHaveBeenCalled();
 });
 it('reports a failed source write so the recorder retains its local backup',async()=>{
  auth({sourceError:{message:'offline'}});expect((await POST(request(payload))).status).toBe(500);
 });
 it('rejects a capture with no image instead of storing an unusable local path',async()=>{
  auth();expect((await POST(request({...payload,steps:[{...payload.steps[0],screenshot_data:null}]}))).status).toBe(400);
 });
});
