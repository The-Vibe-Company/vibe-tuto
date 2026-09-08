import { describe,it,expect,vi } from 'vitest';
import { TutorialService } from './service';
import type { RequestUser } from '@/lib/auth/request';

const tutorialId='11111111-1111-4111-a111-111111111111';
const stepId='22222222-2222-4222-a222-222222222222';
const sourceId='33333333-3333-4333-a333-333333333333';
const step={id:stepId,source_id:sourceId,order_index:0,step_type:'image',text_content:'Click here',annotations:[]};
function database(results:Record<string,unknown>[]) {
  const writes=vi.fn(); const filters:unknown[][]=[];
  const from=vi.fn(()=>{
    const result=results.shift();
    const chain:Record<string,unknown>={then:(resolve:(r:unknown)=>unknown)=>Promise.resolve(result).then(resolve)};
    for(const method of ['select','eq','in','order','limit'])chain[method]=(...args:unknown[])=>{filters.push([method,...args]);return chain;};
    chain.single=()=>Promise.resolve(result);
    chain.upsert=(...args:unknown[])=>{writes(...args);return chain;};
    return chain;
  });
  return {auth:{userId:'owner',supabase:{from}} as unknown as RequestUser,writes,filters};
}
describe('agent ownership and atomic editing boundary',()=>{
  it('scopes tutorial reads to the authenticated user before returning sources',async()=>{
    const db=database([{data:null,error:{message:'not found'}}]);
    await expect(new TutorialService(db.auth).read(tutorialId)).rejects.toThrow('Tutorial not found');
    expect(db.filters).toContainEqual(['eq','user_id','owner']);
    expect(db.writes).not.toHaveBeenCalled();
  });
  it('rejects a screenshot from another tutorial before writing any steps',async()=>{
    const db=database([{data:{id:tutorialId,user_id:'owner'}},{data:[]}]);
    await expect(new TutorialService(db.auth).upsertSteps(tutorialId,[step])).rejects.toThrow('Every source');
    expect(db.writes).not.toHaveBeenCalled();
  });
  it('cannot move a step belonging to another owner or tutorial',async()=>{
    const db=database([{data:{id:tutorialId,user_id:'owner'}},{data:[{id:sourceId}]},{data:[{id:stepId,tutorial_id:'foreign'}]}]);
    await expect(new TutorialService(db.auth).upsertSteps(tutorialId,[step])).rejects.toThrow('Step belongs');
    expect(db.writes).not.toHaveBeenCalled();
  });
  it('reports a rejected batch as failure, never partial success',async()=>{
    const db=database([{data:{id:tutorialId,user_id:'owner'}},{data:[{id:sourceId}]},{data:[]},{data:null,error:{message:'constraint'}}]);
    await expect(new TutorialService(db.auth).upsertSteps(tutorialId,[step])).rejects.toThrow('Could not save');
    expect(db.writes).toHaveBeenCalledTimes(1);
  });
});
