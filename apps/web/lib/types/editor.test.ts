import { describe, it, expect } from 'vitest';
import { getSourceActionType, formatSourceUrl } from './editor';
import type { Source, SourceWithSignedUrl } from './editor';

function makeSource(overrides: Partial<Source>): Source {
  return {
    id: 'src-1',
    tutorial_id: 'tut-1',
    order_index: 0,
    screenshot_url: null,
    click_x: null,
    click_y: null,
    viewport_width: null,
    viewport_height: null,
    click_type: null,
    url: null,
    timestamp_start: null,
    element_info: null,
    created_at: '2024-01-01T00:00:00Z',
    ...overrides,
  };
}

describe('getSourceActionType', () => {
  it('returns tab_change for tab_change click_type', () => {
    const source = makeSource({ click_type: 'tab_change' });
    expect(getSourceActionType(source)).toBe('tab_change');
  });

  it('returns navigation for navigation click_type', () => {
    const source = makeSource({ click_type: 'navigation' });
    expect(getSourceActionType(source)).toBe('navigation');
  });

  it('returns click when click coordinates are present', () => {
    const source = makeSource({ click_x: 100, click_y: 200 });
    expect(getSourceActionType(source)).toBe('click');
  });

  it('returns navigation as default when no click info', () => {
    const source = makeSource({});
    expect(getSourceActionType(source)).toBe('navigation');
  });

  it('prioritizes tab_change over click coordinates', () => {
    const source = makeSource({ click_type: 'tab_change', click_x: 100, click_y: 200 });
    expect(getSourceActionType(source)).toBe('tab_change');
  });

  it('prioritizes navigation over click coordinates', () => {
    const source = makeSource({ click_type: 'navigation', click_x: 100, click_y: 200 });
    expect(getSourceActionType(source)).toBe('navigation');
  });

  it('works with SourceWithSignedUrl type', () => {
    const source: SourceWithSignedUrl = {
      id: 'src-1',
      tutorial_id: 'tut-1',
      order_index: 0,
      screenshot_url: null,
      click_x: 50,
      click_y: 60,
      viewport_width: null,
      viewport_height: null,
      click_type: null,
      url: null,
      timestamp_start: null,
      created_at: '2024-01-01T00:00:00Z',
      signedScreenshotUrl: null,
    };
    expect(getSourceActionType(source)).toBe('click');
  });
});

describe('formatSourceUrl', () => {
  it('returns "Unknown page" for null', () => {
    expect(formatSourceUrl(null)).toBe('Unknown page');
  });

  it('formats URL with hostname and path', () => {
    expect(formatSourceUrl('https://example.com/settings')).toBe('example.com/settings');
  });

  it('formats URL with only hostname for root path', () => {
    expect(formatSourceUrl('https://example.com/')).toBe('example.com');
  });

  it('returns raw string for invalid URL', () => {
    expect(formatSourceUrl('not-a-url')).toBe('not-a-url');
  });

  it('includes full path', () => {
    expect(formatSourceUrl('https://example.com/a/b/c')).toBe('example.com/a/b/c');
  });
});
