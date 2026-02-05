import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  findClosestActionableAncestor,
  getDirectTextContent,
  getElementLabel,
  getElementInfo,
} from './element-label';

// Mock document.body and document.getElementById
const mockGetElementById = vi.fn();
const mockBody = {} as HTMLElement;

Object.defineProperty(global, 'document', {
  value: {
    body: mockBody,
    getElementById: mockGetElementById,
  },
  writable: true,
});

// Mock Node constants
Object.defineProperty(global, 'Node', {
  value: {
    TEXT_NODE: 3,
    ELEMENT_NODE: 1,
  },
  writable: true,
});

// Mock SVGElement
Object.defineProperty(global, 'SVGElement', {
  value: class SVGElement {},
  writable: true,
});

function createTextNode(text: string) {
  return {
    nodeType: Node.TEXT_NODE,
    textContent: text,
  };
}

function createElement(overrides: Partial<{
  tagName: string;
  getAttribute: (attr: string) => string | null;
  hasAttribute: (attr: string) => boolean;
  childNodes: any[];
  parentElement: any;
  id: string;
  className: string;
  querySelector: (sel: string) => any;
  textContent: string;
}> = {}): HTMLElement {
  const attrs: Record<string, string | null> = {};
  const element = {
    tagName: 'DIV',
    getAttribute: vi.fn((attr: string) => attrs[attr] ?? null),
    hasAttribute: vi.fn((attr: string) => attr in attrs && attrs[attr] !== null),
    childNodes: [],
    parentElement: null,
    id: '',
    className: '',
    querySelector: vi.fn(() => null),
    textContent: '',
    ...overrides,
  } as unknown as HTMLElement;

  // Allow setting attributes through a helper
  (element as any)._setAttr = (key: string, value: string | null) => {
    attrs[key] = value;
  };

  return element;
}

function createElementWithAttrs(
  tagName: string,
  attributes: Record<string, string | null>,
  options: {
    childNodes?: any[];
    parentElement?: any;
    id?: string;
    className?: string;
    querySelector?: (sel: string) => any;
  } = {}
): HTMLElement {
  return {
    tagName,
    getAttribute: vi.fn((attr: string) => attributes[attr] ?? null),
    hasAttribute: vi.fn((attr: string) => attr in attributes && attributes[attr] !== null),
    childNodes: options.childNodes ?? [],
    parentElement: options.parentElement ?? null,
    id: options.id ?? '',
    className: options.className ?? '',
    querySelector: options.querySelector ?? vi.fn(() => null),
    textContent: '',
  } as unknown as HTMLElement;
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetElementById.mockReturnValue(null);
});

describe('findClosestActionableAncestor', () => {
  it('returns the element itself if it is actionable (BUTTON)', () => {
    const button = createElementWithAttrs('BUTTON', {});
    const result = findClosestActionableAncestor(button);
    expect(result).toBe(button);
  });

  it('returns the element itself if it has an actionable role', () => {
    const div = createElementWithAttrs('DIV', { role: 'button' });
    const result = findClosestActionableAncestor(div);
    expect(result).toBe(div);
  });

  it('returns parent BUTTON when child is non-actionable', () => {
    const button = createElementWithAttrs('BUTTON', {});
    const span = createElementWithAttrs('SPAN', {}, { parentElement: button });
    // button's parentElement is document.body to terminate the loop
    (button as any).parentElement = mockBody;
    const result = findClosestActionableAncestor(span);
    expect(result).toBe(button);
  });

  it('returns original element when no actionable ancestor exists', () => {
    const grandparent = createElementWithAttrs('DIV', {});
    (grandparent as any).parentElement = mockBody;
    const parent = createElementWithAttrs('DIV', {}, { parentElement: grandparent });
    const child = createElementWithAttrs('SPAN', {}, { parentElement: parent });
    const result = findClosestActionableAncestor(child);
    expect(result).toBe(child);
  });

  it('detects element with onclick attribute', () => {
    const div = createElementWithAttrs('DIV', { onclick: 'doSomething()' });
    const result = findClosestActionableAncestor(div);
    expect(result).toBe(div);
  });

  it('detects element with tabindex >= 0', () => {
    const div = createElementWithAttrs('DIV', { tabindex: '0' });
    const result = findClosestActionableAncestor(div);
    expect(result).toBe(div);
  });

  it('detects element with data-action', () => {
    const div = createElementWithAttrs('DIV', { 'data-action': 'click' });
    const result = findClosestActionableAncestor(div);
    expect(result).toBe(div);
  });

  it('detects A tag as actionable', () => {
    const link = createElementWithAttrs('A', { href: '/page' });
    const result = findClosestActionableAncestor(link);
    expect(result).toBe(link);
  });

  it('detects INPUT tag as actionable', () => {
    const input = createElementWithAttrs('INPUT', { type: 'text' });
    const result = findClosestActionableAncestor(input);
    expect(result).toBe(input);
  });
});

describe('getDirectTextContent', () => {
  it('extracts direct text nodes', () => {
    const element = createElementWithAttrs('DIV', {}, {
      childNodes: [
        createTextNode('Hello'),
        createTextNode('World'),
      ],
    });
    expect(getDirectTextContent(element)).toBe('Hello World');
  });

  it('ignores non-text child nodes', () => {
    const child = createElementWithAttrs('SPAN', {});
    const element = createElementWithAttrs('DIV', {}, {
      childNodes: [
        createTextNode('Hello'),
        { nodeType: Node.ELEMENT_NODE, ...child } as any,
      ],
    });
    expect(getDirectTextContent(element)).toBe('Hello');
  });

  it('returns empty string when no text nodes', () => {
    const element = createElementWithAttrs('DIV', {}, { childNodes: [] });
    expect(getDirectTextContent(element)).toBe('');
  });

  it('trims whitespace from text nodes', () => {
    const element = createElementWithAttrs('DIV', {}, {
      childNodes: [
        createTextNode('  Hello  '),
        createTextNode('  World  '),
      ],
    });
    expect(getDirectTextContent(element)).toBe('Hello World');
  });

  it('skips empty text nodes', () => {
    const element = createElementWithAttrs('DIV', {}, {
      childNodes: [
        createTextNode(''),
        createTextNode('   '),
        createTextNode('Hello'),
      ],
    });
    expect(getDirectTextContent(element)).toBe('Hello');
  });
});

describe('getElementLabel', () => {
  it('prioritizes aria-label', () => {
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': 'Close dialog',
    });
    (button as any).parentElement = mockBody;
    expect(getElementLabel(button)).toBe('Close dialog');
  });

  it('prioritizes aria-labelledby over aria-label', () => {
    const labelEl = { textContent: 'Label from reference' };
    mockGetElementById.mockReturnValue(labelEl);

    const button = createElementWithAttrs('BUTTON', {
      'aria-labelledby': 'label-id',
      'aria-label': 'Fallback label',
    });
    (button as any).parentElement = mockBody;
    expect(getElementLabel(button)).toBe('Label from reference');
  });

  it('uses title as fallback', () => {
    const div = createElementWithAttrs('DIV', {
      title: 'Tooltip text',
    });
    (div as any).parentElement = mockBody;
    expect(getElementLabel(div)).toBe('Tooltip text');
  });

  it('uses alt for IMG elements', () => {
    const img = createElementWithAttrs('IMG', {
      alt: 'Logo image',
    });
    (img as any).parentElement = mockBody;
    expect(getElementLabel(img)).toBe('Logo image');
  });

  it('uses placeholder for INPUT elements', () => {
    const input = createElementWithAttrs('INPUT', {
      placeholder: 'Search...',
    });
    (input as any).parentElement = mockBody;
    expect(getElementLabel(input)).toBe('Search...');
  });

  it('uses value for BUTTON elements', () => {
    const button = createElementWithAttrs('BUTTON', {
      value: 'Submit',
    });
    // No text content
    (button as any).parentElement = mockBody;
    (button as any).childNodes = [];
    expect(getElementLabel(button)).toBe('Submit');
  });

  it('falls back to tag name map', () => {
    const nav = createElementWithAttrs('NAV', {});
    (nav as any).parentElement = mockBody;
    (nav as any).childNodes = [];
    expect(getElementLabel(nav)).toBe('navigation');
  });

  it('falls back to role attribute', () => {
    const div = createElementWithAttrs('DIV', { role: 'menuitem' });
    (div as any).parentElement = mockBody;
    (div as any).childNodes = [];
    expect(getElementLabel(div)).toBe('menuitem');
  });

  it('falls back to raw tagName for unmapped tags', () => {
    const custom = createElementWithAttrs('CUSTOM-ELEMENT', {});
    (custom as any).parentElement = mockBody;
    (custom as any).childNodes = [];
    expect(getElementLabel(custom)).toBe('custom-element');
  });

  it('skips CSS-like aria-label', () => {
    const div = createElementWithAttrs('DIV', {
      'aria-label': 'display: flex',
      title: 'Real title',
    });
    (div as any).parentElement = mockBody;
    expect(getElementLabel(div)).toBe('Real title');
  });

  it('truncates long labels to 60 chars', () => {
    const longLabel = 'a'.repeat(100);
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': longLabel,
    });
    (button as any).parentElement = mockBody;
    expect(getElementLabel(button).length).toBe(60);
  });

  it('traverses to actionable ancestor', () => {
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': 'Parent button',
    });
    (button as any).parentElement = mockBody;
    const icon = createElementWithAttrs('SVG', {}, { parentElement: button });
    expect(getElementLabel(icon)).toBe('Parent button');
  });
});

describe('getElementInfo', () => {
  it('returns tag, text, and basic info', () => {
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': 'Save',
    });
    (button as any).parentElement = mockBody;
    (button as any).id = 'save-btn';
    (button as any).className = 'btn-primary';

    const info = getElementInfo(button);
    expect(info.tag).toBe('BUTTON');
    expect(info.text).toBe('Save');
    expect(info.id).toBe('save-btn');
    expect(info.className).toBe('btn-primary');
  });

  it('includes role when present', () => {
    const div = createElementWithAttrs('DIV', {
      role: 'button',
      'aria-label': 'Toggle',
    });
    (div as any).parentElement = mockBody;

    const info = getElementInfo(div);
    expect(info.role).toBe('button');
  });

  it('omits undefined optional fields', () => {
    const div = createElementWithAttrs('DIV', {});
    (div as any).parentElement = mockBody;
    (div as any).childNodes = [];

    const info = getElementInfo(div);
    expect(info.id).toBeUndefined();
    expect(info.className).toBeUndefined();
    expect(info.role).toBeUndefined();
  });

  it('includes actionableTag when ancestor differs', () => {
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': 'Click me',
    });
    (button as any).parentElement = mockBody;
    const span = createElementWithAttrs('SPAN', {}, { parentElement: button });

    const info = getElementInfo(span);
    expect(info.tag).toBe('SPAN');
    expect(info.actionableTag).toBe('BUTTON');
  });

  it('omits actionableTag when element is already actionable', () => {
    const button = createElementWithAttrs('BUTTON', {
      'aria-label': 'Click me',
    });
    (button as any).parentElement = mockBody;

    const info = getElementInfo(button);
    expect(info.actionableTag).toBeUndefined();
  });

  it('handles SVG className (non-string)', () => {
    const svg = createElementWithAttrs('SVG', {
      class: 'icon-class',
    });
    (svg as any).parentElement = mockBody;
    (svg as any).childNodes = [];
    // Simulate SVGAnimatedString className
    Object.defineProperty(svg, 'className', {
      value: { baseVal: 'icon-class' },
      writable: false,
    });

    const info = getElementInfo(svg);
    expect(info.className).toBe('icon-class');
  });
});
