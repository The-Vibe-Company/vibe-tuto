import { resolveRequestUser } from '@/lib/auth/request';
import { z } from 'zod';
import { createHash } from 'node:crypto';

const stepSchema = z.object({
  order_index:z.number().int().min(0).optional(), timestamp:z.number().finite().min(0),
  action_type:z.string().max(50), screenshot_key:z.string().max(500),
  screenshot_data:z.string().max(15_000_000).nullable().optional(),
  click_x:z.number().min(0).max(1).nullable().optional(), click_y:z.number().min(0).max(1).nullable().optional(),
  viewport_width:z.number().int().min(0).max(20000).nullable().optional(), viewport_height:z.number().int().min(0).max(20000).nullable().optional(),
  app_bundle_id:z.string().nullable().optional(), app_name:z.string().nullable().optional(),
  window_title:z.string().nullable().optional(), url:z.string().nullable().optional(),
  element_info:z.record(z.unknown()).nullable().optional(), auto_caption:z.string().nullable().optional(),
});
const recordingSchema = z.object({
  recording:z.object({client_id:z.string().uuid().optional(),title:z.string().max(300).optional(),duration:z.number().finite().min(0),started_at:z.string()}),
  steps:z.array(stepSchema).min(1).max(500),
});

/** Stable UUID per capture, so retries upsert sources instead of duplicating them. */
function sourceId(tutorialId:string,index:number) {
  const hex = createHash('sha256').update(`${tutorialId}:${index}`).digest('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-4${hex.slice(13,16)}-a${hex.slice(17,20)}-${hex.slice(20,32)}`;
}
export const maxDuration = 120;
export async function POST(request:Request) {
  try {
    const auth = await resolveRequestUser(request);
    if (!auth) return Response.json({error:'Unauthorized'},{status:401});
    const parsed = recordingSchema.safeParse(await request.json());
    if (!parsed.success) return Response.json({error:'Invalid recording',details:parsed.error.flatten()},{status:400});
    const body = parsed.data;
    const id = body.recording.client_id ?? crypto.randomUUID();
    const {supabase,userId} = auth;
    const {data:existing,error:lookupError} = await supabase.from('tutorials').select('id,user_id').eq('id',id).maybeSingle();
    if (lookupError) return Response.json({error:'Could not check recording'},{status:500});
    if (existing && existing.user_id !== userId) return Response.json({error:'Recording ID unavailable'},{status:409});
    if (!existing) {
      const {error} = await supabase.from('tutorials').insert({id,user_id:userId,title:body.recording.title || 'Desktop recording',status:'processing'});
      if (error) return Response.json({error:'Could not create recording; retry with the same client_id'},{status:409});
    }
    const inserts = [];
    for (let i=0;i<body.steps.length;i++) {
      const step = body.steps[i];
      const index = step.order_index ?? i;
      const path = `${userId}/${id}/${index}.jpg`;
      if (step.screenshot_data) {
        const buffer = Buffer.from(step.screenshot_data,'base64');
        if (!buffer.length || buffer.length > 10*1024*1024) return Response.json({error:'Invalid screenshot size'},{status:413});
        const {error} = await supabase.storage.from('screenshots').upload(path,buffer,{contentType:'image/jpeg',upsert:true});
        if (error) return Response.json({error:`Capture ${i+1} could not be stored; retry the recording`},{status:500});
      } else {
        return Response.json({error:`Capture ${i+1} is missing its image; recording remains recoverable`},{status:400});
      }
      const vw=step.viewport_width || 0, vh=step.viewport_height || 0;
      inserts.push({
        id:sourceId(id,index),tutorial_id:id,order_index:index,screenshot_url:path,
        click_x:step.click_x != null && vw ? Math.round(step.click_x*vw) : null,
        click_y:step.click_y != null && vh ? Math.round(step.click_y*vh) : null,
        viewport_width:vw || null,viewport_height:vh || null,click_type:step.action_type,
        url:step.url ?? null,timestamp_start:step.timestamp,
        element_info:(step.element_info ?? null) as import('@/lib/supabase/types').Json,
        app_bundle_id:step.app_bundle_id,app_name:step.app_name,window_title:step.window_title,
        action_type:step.action_type,auto_caption:step.auto_caption,recording_id:id,
      });
    }
    const {error} = await supabase.from('sources').upsert(inserts,{onConflict:'id'});
    if (error) return Response.json({error:'Could not save capture sources; retry the recording'},{status:500});
    return Response.json({tutorialId:id,recordingId:id,status:'processing',sourcesCreated:inserts.length,editorUrl:`/editor/${id}`});
  } catch(error) {
    return Response.json({error:error instanceof SyntaxError ? 'Invalid JSON' : 'Recording upload failed'},{status:error instanceof SyntaxError ? 400 : 500});
  }
}
