import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './route';

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}));

vi.mock('@/lib/label-utils', () => ({
  generateStepDescription: vi.fn(() => 'Click on <strong>Submit</strong>'),
  generateNavigationDescription: vi.fn(() => 'Navigate to <strong>example.com</strong>'),
  generateTabChangeDescription: vi.fn(() => 'Switch to <strong>My Tab</strong>'),
}));

import { createClient } from '@/lib/supabase/server';

const mockCreateClient = vi.mocked(createClient);

function createJsonRequest(url: string, body: object): Request {
  return new Request(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function createMockSupabase(overrides: {
  user?: { id: string } | null;
  authError?: object | null;
  tutorial?: Record<string, unknown> | null;
  tutorialError?: object | null;
  source?: Record<string, unknown> | null;
  sourceError?: object | null;
  existingSteps?: Array<{ order_index: number }> | null;
  stepsToShift?: Array<{ id: string; order_index: number }> | null;
  insertedStep?: Record<string, unknown> | null;
  insertError?: object | null;
}) {
  const {
    user = null,
    authError = null,
    tutorial = null,
    tutorialError = null,
    source = null,
    sourceError = null,
    existingSteps = null,
    stepsToShift = null,
    insertedStep = null,
    insertError = null,
  } = overrides;

  const mockFrom = vi.fn().mockImplementation((table: string) => {
    if (table === 'tutorials') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: tutorial,
              error: tutorialError,
            }),
          }),
        }),
      };
    }
    if (table === 'sources') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: source,
                error: sourceError,
              }),
            }),
          }),
        }),
      };
    }
    if (table === 'steps') {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: existingSteps,
                error: null,
              }),
            }),
            gte: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({
                data: stepsToShift,
                error: null,
              }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: insertedStep,
              error: insertError,
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        }),
      };
    }
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ data: null, error: null }),
      }),
    };
  });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: mockFrom,
  };
}

describe('POST /api/steps', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when user is not authenticated', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: null,
        authError: { message: 'Not authenticated' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
    });
    const response = await POST(request);
    expect(response.status).toBe(401);
    const body = await response.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('returns 400 when tutorial_id is missing', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {});
    const response = await POST(request);
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toContain('tutorial_id');
  });

  it('returns 404 when tutorial is not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: null,
        tutorialError: { message: 'Not found' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 'nonexistent',
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Tutorial not found');
  });

  it('returns 403 when user does not own the tutorial', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'other-user' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
    });
    const response = await POST(request);
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error).toBe('Forbidden');
  });

  it('returns 404 when source_id is provided but not found', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        source: null,
        sourceError: { message: 'Not found' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      source_id: 'nonexistent-source',
    });
    const response = await POST(request);
    expect(response.status).toBe(404);
    const body = await response.json();
    expect(body.error).toBe('Source not found');
  });

  it('auto-calculates order_index as max + 1', async () => {
    const insertedStep = {
      id: 'new-step',
      tutorial_id: 't1',
      order_index: 3,
      step_type: 'text',
    };

    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [{ order_index: 2 }],
        insertedStep,
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      text_content: 'New step',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.step).toEqual(insertedStep);
  });

  it('creates step with click-indicator annotation from source click coords', async () => {
    const insertedStep = {
      id: 'new-step',
      tutorial_id: 't1',
      order_index: 0,
      step_type: 'image',
    };

    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        source: {
          id: 'src-1',
          tutorial_id: 't1',
          click_x: 100,
          click_y: 200,
          viewport_width: 1000,
          viewport_height: 800,
          element_info: '{"tag":"BUTTON","text":"Submit"}',
          click_type: 'click',
        },
        existingSteps: [],
        insertedStep,
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      source_id: 'src-1',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.step).toEqual(insertedStep);
  });

  it('returns 500 when insert fails', async () => {
    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [],
        insertedStep: null,
        insertError: { message: 'DB insert error' },
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      text_content: 'New step',
    });
    const response = await POST(request);
    expect(response.status).toBe(500);
    const body = await response.json();
    expect(body.error).toContain('Failed to create step');
  });

  it('defaults step_type to text when no source_id', async () => {
    const insertedStep = {
      id: 'new-step',
      tutorial_id: 't1',
      order_index: 0,
      step_type: 'text',
    };

    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        existingSteps: [],
        insertedStep,
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      text_content: 'A text step',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.step.step_type).toBe('text');
  });

  it('defaults step_type to image when source_id is provided', async () => {
    const insertedStep = {
      id: 'new-step',
      tutorial_id: 't1',
      order_index: 0,
      step_type: 'image',
    };

    mockCreateClient.mockResolvedValue(
      createMockSupabase({
        user: { id: 'user-123' },
        tutorial: { id: 't1', user_id: 'user-123' },
        source: {
          id: 'src-1',
          tutorial_id: 't1',
          click_x: null,
          click_y: null,
          viewport_width: null,
          viewport_height: null,
          element_info: null,
          click_type: 'click',
        },
        existingSteps: [],
        insertedStep,
      }) as any
    );

    const request = createJsonRequest('http://localhost:3678/api/steps', {
      tutorial_id: 't1',
      source_id: 'src-1',
    });
    const response = await POST(request);
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.step.step_type).toBe('image');
  });
});
