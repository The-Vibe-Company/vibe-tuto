import type { GeneratedTutorialContent } from '@/lib/types/generation';

/**
 * Creates a mock Anthropic messages.create() response with a tool_use block.
 */
export function createMockAnthropicResponse(toolInput: unknown) {
  return {
    id: 'msg_mock_123',
    type: 'message' as const,
    role: 'assistant' as const,
    model: 'claude-sonnet-4-5-20250929',
    content: [
      {
        type: 'tool_use' as const,
        id: 'toolu_mock_123',
        name: 'generate_tutorial',
        input: toolInput,
      },
    ],
    stop_reason: 'tool_use' as const,
    usage: {
      input_tokens: 1500,
      output_tokens: 350,
    },
  };
}

/**
 * Creates a valid GeneratedTutorialContent object for testing.
 */
export function createMockGeneratedContent(
  overrides?: Partial<GeneratedTutorialContent>
): GeneratedTutorialContent {
  return {
    title: 'How to Create a New Project',
    description: 'A step-by-step guide to creating and configuring a new project in the dashboard.',
    steps: [
      {
        sourceId: 'source-1',
        textContent: 'Click the "New Project" button in the top right corner.',
      },
      {
        sourceId: 'source-2',
        textContent: 'Enter a name for your project and click "Create".',
        description: 'Choose a descriptive name that helps you identify the project later.',
      },
    ],
    ...overrides,
  };
}
