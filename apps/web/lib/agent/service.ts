import type { RequestUser } from '@/lib/auth/request';
import type { Annotation, StepType } from '@/lib/types/editor';
import type { Json } from '@/lib/supabase/types';
import { upsertStepsSchema } from './schema';
import { nanoid } from 'nanoid';

function storedAnnotations(value: unknown): Annotation[] {
  if (typeof value === 'string') { try { value = JSON.parse(value); } catch { return []; } }
  return Array.isArray(value) ? value as Annotation[] : [];
}

export class AgentError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

/** All privileged storage/database operations are scoped to this authenticated owner. */
export class TutorialService {
  constructor(readonly auth: RequestUser) {}

  async owned(id: string) {
    const { data, error } = await this.auth.supabase.from('tutorials').select('*')
      .eq('id', id).eq('user_id', this.auth.userId).single();
    if (error || !data) throw new AgentError('Tutorial not found', 404);
    return data;
  }

  async list(limit = 30) {
    const { data, error } = await this.auth.supabase.from('tutorials').select('id,title,description,status,updated_at')
      .eq('user_id', this.auth.userId).order('updated_at', { ascending:false }).limit(limit);
    if (error) throw new AgentError('Could not list tutorials', 500);
    return data;
  }

  async read(id: string) {
    const tutorial = await this.owned(id);
    const [sourcesResult, stepsResult] = await Promise.all([
      this.auth.supabase.from('sources').select('*').eq('tutorial_id', id).order('order_index'),
      this.auth.supabase.from('steps').select('*').eq('tutorial_id', id).order('order_index'),
    ]);
    if (sourcesResult.error || stepsResult.error) throw new AgentError('Could not read tutorial content', 500);
    const sources = await Promise.all((sourcesResult.data ?? []).map(async source => ({
      ...source,
      imageUrl: source.screenshot_url ? await this.signed('screenshots', source.screenshot_url) : null,
      clickPosition: source.click_x != null && source.click_y != null && source.viewport_width && source.viewport_height
        ? { x: source.click_x/source.viewport_width, y: source.click_y/source.viewport_height } : null,
    })));
    const audioUrl = await this.signed('recordings', `${this.auth.userId}/${id}.webm`)
      || await this.signed('recordings', `${this.auth.userId}/${id}.m4a`);
    const { data: transcriptFile } = await this.auth.supabase.storage.from('recordings')
      .download(`${this.auth.userId}/${id}.transcript.json`);
    let transcript: unknown = null;
    if (transcriptFile) { try { transcript = JSON.parse(await transcriptFile.text()); } catch { /* Missing/old transcript can be regenerated. */ } }
    return { tutorial, sources, steps: stepsResult.data ?? [], audioUrl, transcript,
      coordinates: 'Annotations use 0–1 coordinates relative to the original screenshot; x right, y down. Call preview_step after editing to inspect the rendered result.' };
  }

  private async signed(bucket: string, path: string) {
    if (!path.startsWith(`${this.auth.userId}/`)) return null;
    const { data } = await this.auth.supabase.storage.from(bucket).createSignedUrl(path, 3600);
    return data?.signedUrl ?? null;
  }

  async image(tutorialId: string, sourceId: string) {
    await this.owned(tutorialId);
    const { data } = await this.auth.supabase.from('sources').select('screenshot_url')
      .eq('tutorial_id', tutorialId).eq('id', sourceId).single();
    if (!data?.screenshot_url?.startsWith(`${this.auth.userId}/`)) throw new AgentError('Source image not found', 404);
    const { data: image, error } = await this.auth.supabase.storage.from('screenshots').download(data.screenshot_url);
    if (error || !image) throw new AgentError('Source image unavailable', 404);
    if (image.size > 20 * 1024 * 1024) throw new AgentError('Source image too large', 413);
    return Buffer.from(await image.arrayBuffer());
  }

  async update(id: string, title?: string, description?: string) {
    await this.owned(id);
    const { data, error } = await this.auth.supabase.from('tutorials').update({
      ...(title !== undefined ? { title } : {}), ...(description !== undefined ? { description } : {}),
    }).eq('id', id).eq('user_id', this.auth.userId).select().single();
    if (error) throw new AgentError('Could not update tutorial', 500);
    return data;
  }

  async upsertSteps(id: string, input: unknown) {
    await this.owned(id);
    const steps = upsertStepsSchema.parse(input);
    const sourceIds = [...new Set(steps.flatMap(s => s.source_id ? [s.source_id] : []))];
    if (sourceIds.length) {
      const { data, error } = await this.auth.supabase.from('sources').select('id').eq('tutorial_id', id).in('id', sourceIds);
      if (error || data?.length !== sourceIds.length) throw new AgentError('Every source must belong to this tutorial');
    }
    // Prevent a supplied UUID from moving an existing step across tutorials.
    const { data: existing, error: existingError } = await this.auth.supabase.from('steps')
      .select('id,tutorial_id').in('id', steps.map(s => s.id));
    if (existingError) throw new AgentError('Could not verify step IDs', 500);
    if (existing?.some(s => s.tutorial_id !== id)) throw new AgentError('Step belongs to another tutorial', 403);
    const { data, error } = await this.auth.supabase.from('steps').upsert(steps.map(s => ({
      ...s, tutorial_id:id, annotations:s.annotations as Json,
    })), { onConflict:'id' }).select();
    if (error) throw new AgentError('Could not save steps; no batch success reported', 500);
    return data;
  }

  async removeStep(id: string, stepId: string) {
    await this.owned(id);
    const { error } = await this.auth.supabase.from('steps').delete().eq('tutorial_id', id).eq('id', stepId);
    if (error) throw new AgentError('Could not remove step', 500);
    return { success:true };
  }

  async share(id: string, visibility: 'private' | 'link_only', origin: string) {
    const tutorial = await this.owned(id);
    const token = visibility === 'private' ? null : tutorial.public_token || nanoid(20);
    const { error } = await this.auth.supabase.from('tutorials').update({
      visibility, is_public:visibility !== 'private', public_token:token,
      published_at:token ? tutorial.published_at || new Date().toISOString() : tutorial.published_at,
    }).eq('id', id).eq('user_id', this.auth.userId);
    if (error) throw new AgentError('Could not change sharing', 500);
    return { visibility, url:token ? `${origin}/t/${token}` : null };
  }

  async preview(id: string, stepId: string) {
    await this.owned(id);
    const { data } = await this.auth.supabase.from('steps').select('*').eq('tutorial_id', id).eq('id', stepId).single();
    if (!data?.source_id) throw new AgentError('Step has no source image', 404);
    const { renderAnnotatedImage } = await import('@/lib/render/annotations');
    return renderAnnotatedImage(await this.image(id, data.source_id), storedAnnotations(data.annotations));
  }

  async pdf(id: string) {
    const { tutorial, steps } = await this.read(id);
    const { renderTutorialPdf } = await import('@/lib/render/tutorial-pdf');
    const content = [];
    // Load one image at a time; bound work and memory for exports.
    if (steps.length > 200) throw new AgentError('PDF export supports up to 200 steps', 413);
    for (const step of steps) content.push({
      text_content:step.text_content, description:step.description, step_type:(step.step_type || 'image') as StepType,
      annotations:storedAnnotations(step.annotations),
      loadImage:step.source_id ? () => this.image(id, step.source_id!) : undefined,
    });
    return renderTutorialPdf({ title:tutorial.title, description:tutorial.description, steps:content });
  }
}
