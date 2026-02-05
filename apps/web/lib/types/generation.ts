/**
 * Types and schema for AI-powered tutorial generation using Claude.
 */

/**
 * Generation style options.
 */
export type GenerationStyle = 'concise' | 'normal' | 'detailed';

/**
 * Options for customizing tutorial generation.
 */
export interface GenerationOptions {
  /** User's description of what the tutorial should teach */
  userGoal?: string;
  /** Writing style preference */
  style: GenerationStyle;
}

/**
 * A generated step instruction for a tutorial.
 */
export interface GeneratedStep {
  /** The ID of the source this step describes */
  sourceId: string;
  /** Generated instruction text for this step (1-2 sentences) */
  textContent: string;
  /** Optional detailed explanation shown below the screenshot */
  description?: string;
}

/**
 * The complete generated content for a tutorial.
 */
export interface GeneratedTutorialContent {
  /** A concise, descriptive title for the tutorial */
  title: string;
  /** A 1-2 sentence description of what this tutorial teaches */
  description: string;
  /** Generated instructions for each step */
  steps: GeneratedStep[];
}

/**
 * Response from the generate-tutorial API endpoint.
 */
export interface GenerateTutorialResponse {
  success: true;
  generated: GeneratedTutorialContent;
  metadata: {
    modelUsed: string;
    inputTokens: number;
    outputTokens: number;
    processingTimeMs: number;
  };
}

/**
 * Error response from the generate-tutorial API endpoint.
 */
export interface GenerateTutorialErrorResponse {
  success: false;
  error: string;
  code:
    | 'UNAUTHORIZED'
    | 'NOT_FOUND'
    | 'NO_SOURCES'
    | 'RATE_LIMITED'
    | 'GENERATION_FAILED'
    | 'INTERNAL_ERROR';
}

/**
 * JSON Schema for Claude's tool input.
 * Used with tools parameter for structured output.
 */
export const TUTORIAL_GENERATION_SCHEMA = {
  name: 'tutorial_content',
  strict: true,
  schema: {
    type: 'object' as const,
    properties: {
      title: {
        type: 'string' as const,
        description: 'A concise, descriptive title for the tutorial (max 100 characters)',
      },
      description: {
        type: 'string' as const,
        description: 'A 1-2 sentence description of what this tutorial teaches',
      },
      steps: {
        type: 'array' as const,
        description: 'Generated instructions for each step in order',
        items: {
          type: 'object' as const,
          properties: {
            sourceId: {
              type: 'string' as const,
              description: 'The ID of the source this step describes (must match a provided source ID)',
            },
            textContent: {
              type: 'string' as const,
              description: 'Short, actionable instruction for this step (1-2 sentences max). Focus on WHAT to do.',
            },
            description: {
              type: 'string' as const,
              description:
                'Optional detailed explanation of WHY this step matters (2-4 sentences). Only include when style is "detailed".',
            },
          },
          required: ['sourceId', 'textContent'] as string[],
          additionalProperties: false,
        },
      },
    },
    required: ['title', 'description', 'steps'] as string[],
    additionalProperties: false,
  },
};

/**
 * Style-specific instructions for the system prompt.
 */
const STYLE_INSTRUCTIONS: Record<GenerationStyle, string> = {
  concise: `
Writing Style: CONCISE
- Keep textContent VERY brief (1 sentence per step, max 15 words)
- Do NOT include descriptions - leave them empty
- Focus only on the essential action to take
- Omit explanations, context, and tips`,

  normal: `
Writing Style: NORMAL
- Write clear textContent (1-2 sentences per step)
- Do NOT include descriptions - leave them empty
- Add brief context in textContent when it helps understanding
- Balance between brevity and clarity`,

  detailed: `
Writing Style: DETAILED
- Write clear textContent (1-2 sentences for the action)
- INCLUDE description for each step explaining WHY this matters (2-4 sentences)
- Add context, tips, potential pitfalls, and best practices in descriptions
- Help users understand not just WHAT to do but WHY`,
};

/**
 * Base system prompt for tutorial generation.
 */
const BASE_SYSTEM_PROMPT = `You are an expert technical writer creating step-by-step tutorials.

Your task is to analyze screenshots of a user's workflow and generate clear, actionable tutorial content.

Core Guidelines:
- Detect the language from the transcription (if provided) and generate content in the SAME language
- If no transcription, detect the language from the UI screenshots and use that language
- Write in second person ("Click the button" / "Cliquez sur le bouton")
- Be specific about UI elements (use element names, button text when available)
- If click coordinates are provided, reference the clicked element
- Generate a descriptive title that explains what the tutorial teaches
- Write a brief description summarizing the tutorial's purpose

For each step, describe what action the user should take based on:
1. The screenshot showing the current state
2. The click position and element being interacted with (if available)
3. Any transcription/narration from the user (if available)
4. The URL context (if available)`;

/**
 * Generate the system prompt based on generation options.
 */
export function getGenerationSystemPrompt(options: GenerationOptions): string {
  const styleInstructions = STYLE_INSTRUCTIONS[options.style];

  const userGoalContext = options.userGoal?.trim()
    ? `

Tutorial Goal (from user):
"${options.userGoal}"

Keep this goal in mind when writing instructions. Tailor the content to achieve this specific objective.`
    : '';

  return `${BASE_SYSTEM_PROMPT}
${styleInstructions}${userGoalContext}`;
}

/**
 * Default system prompt (for backward compatibility).
 */
export const GENERATION_SYSTEM_PROMPT = getGenerationSystemPrompt({ style: 'normal' });
