import {it,expect,vi} from 'vitest';
vi.mock('@/lib/deepgram',()=>({getDeepgramClient:vi.fn(),TRANSCRIPTION_OPTIONS:{utterances:true}}));
import {getDeepgramClient} from '@/lib/deepgram';
import {transcribeTutorial} from './transcription';
it('transcribes uploaded bytes so isolated localhost storage works, then caches segments',async()=>{
 const transcribeFile=vi.fn().mockResolvedValue({result:{results:{utterances:[{start:1,end:2,transcript:'Ouvrez Companion'}]},metadata:{duration:3}},error:null});
 vi.mocked(getDeepgramClient).mockReturnValue({listen:{prerecorded:{transcribeFile}}} as never);
 const upload=vi.fn().mockResolvedValue({error:null});
 const download=vi.fn().mockImplementation((path:string)=>Promise.resolve({data:path.endsWith('.webm')?new Blob(['audio bytes']):null}));
 const auth={userId:'owner',supabase:{from:()=>({select:()=>({eq:()=>({eq:()=>({single:async()=>({data:{id:'guide'}})})})})}),storage:{from:()=>({download,upload})}}};
 const r=await transcribeTutorial(auth as never,'guide');
 expect(Buffer.isBuffer(transcribeFile.mock.calls[0][0])).toBe(true);
 expect(transcribeFile.mock.calls[0][0].toString()).toBe('audio bytes');
 expect(r.segments).toEqual([{start:1,end:2,transcript:'Ouvrez Companion'}]);
 expect(upload).toHaveBeenCalledWith('owner/guide.transcript.json',expect.any(String),expect.objectContaining({upsert:true}));
});
