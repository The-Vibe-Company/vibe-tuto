import { describe, it, expect } from 'vitest';
import {
  getGenerationSystemPrompt,
  TUTORIAL_GENERATION_SCHEMA,
  GENERATION_SYSTEM_PROMPT,
} from './generation';

describe('getGenerationSystemPrompt', () => {
  it('includes concise style instructions', () => {
    const prompt = getGenerationSystemPrompt({ style: 'concise' });
    expect(prompt).toContain('Writing Style: CONCISE');
    expect(prompt).toContain('VERY brief');
    expect(prompt).toContain('Do NOT include descriptions');
  });

  it('includes normal style instructions', () => {
    const prompt = getGenerationSystemPrompt({ style: 'normal' });
    expect(prompt).toContain('Writing Style: NORMAL');
    expect(prompt).toContain('Balance between brevity and clarity');
  });

  it('includes detailed style instructions', () => {
    const prompt = getGenerationSystemPrompt({ style: 'detailed' });
    expect(prompt).toContain('Writing Style: DETAILED');
    expect(prompt).toContain('INCLUDE description for each step');
    expect(prompt).toContain('WHY');
  });

  it('includes user goal when provided', () => {
    const prompt = getGenerationSystemPrompt({
      style: 'normal',
      userGoal: 'Learn how to deploy to Vercel',
    });
    expect(prompt).toContain('Tutorial Goal (from user):');
    expect(prompt).toContain('Learn how to deploy to Vercel');
    expect(prompt).toContain('Tailor the content to achieve this specific objective');
  });

  it('does not include user goal section when empty', () => {
    const prompt = getGenerationSystemPrompt({ style: 'normal' });
    expect(prompt).not.toContain('Tutorial Goal (from user):');
  });

  it('does not include user goal section for whitespace-only goal', () => {
    const prompt = getGenerationSystemPrompt({ style: 'normal', userGoal: '   ' });
    expect(prompt).not.toContain('Tutorial Goal (from user):');
  });

  it('always includes the base system prompt', () => {
    const prompt = getGenerationSystemPrompt({ style: 'concise' });
    expect(prompt).toContain('expert technical writer');
    expect(prompt).toContain('step-by-step tutorials');
    expect(prompt).toContain('second person');
  });

  it('includes language detection guidance', () => {
    const prompt = getGenerationSystemPrompt({ style: 'normal' });
    expect(prompt).toContain('Detect the language');
    expect(prompt).toContain('SAME language');
  });
});

describe('TUTORIAL_GENERATION_SCHEMA', () => {
  it('has the correct name', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.name).toBe('tutorial_content');
  });

  it('is strict', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.strict).toBe(true);
  });

  it('has required top-level fields: title, description, steps', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.schema.required).toEqual(['title', 'description', 'steps']);
  });

  it('does not allow additional properties at top level', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.schema.additionalProperties).toBe(false);
  });

  it('defines title as string', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.schema.properties.title.type).toBe('string');
  });

  it('defines steps as array', () => {
    expect(TUTORIAL_GENERATION_SCHEMA.schema.properties.steps.type).toBe('array');
  });

  it('defines step items with sourceId and textContent required', () => {
    const stepSchema = TUTORIAL_GENERATION_SCHEMA.schema.properties.steps.items;
    expect(stepSchema.required).toEqual(['sourceId', 'textContent']);
  });

  it('defines step items with additionalProperties false', () => {
    const stepSchema = TUTORIAL_GENERATION_SCHEMA.schema.properties.steps.items;
    expect(stepSchema.additionalProperties).toBe(false);
  });

  it('includes description field in step items', () => {
    const stepSchema = TUTORIAL_GENERATION_SCHEMA.schema.properties.steps.items;
    expect(stepSchema.properties.description).toBeDefined();
    expect(stepSchema.properties.description.type).toBe('string');
  });
});

describe('GENERATION_SYSTEM_PROMPT', () => {
  it('is the default normal style prompt', () => {
    const normalPrompt = getGenerationSystemPrompt({ style: 'normal' });
    expect(GENERATION_SYSTEM_PROMPT).toBe(normalPrompt);
  });
});
