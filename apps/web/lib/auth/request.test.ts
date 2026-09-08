import { describe,it,expect,vi,beforeEach } from 'vitest';
vi.mock('@/lib/supabase/server',()=>({createClient:vi.fn()}));
vi.mock('@/lib/supabase/admin',()=>({createAdminClient:vi.fn(()=>({kind:'admin'}))}));
vi.mock('./api-token',()=>({validateApiToken:vi.fn()}));
import {createClient} from '@/lib/supabase/server';
import {createAdminClient} from '@/lib/supabase/admin';
import {validateApiToken} from './api-token';
import {resolveRequestUser} from './request';
beforeEach(()=>vi.clearAllMocks());
describe('request authentication',()=>{
  it('never grants cookie privileges when an explicit bearer token is invalid',async()=>{
    vi.mocked(validateApiToken).mockResolvedValue(null);
    expect(await resolveRequestUser(new Request('http://localhost/api/mcp',{headers:{Authorization:'Bearer invalid'}}))).toBeNull();
    expect(createClient).not.toHaveBeenCalled();expect(createAdminClient).not.toHaveBeenCalled();
  });
  it('resolves a valid revocable token to its owner',async()=>{
    vi.mocked(validateApiToken).mockResolvedValue('owner');
    expect((await resolveRequestUser(new Request('http://localhost/api/mcp',{headers:{Authorization:'Bearer valid'}})))?.userId).toBe('owner');
  });
});
