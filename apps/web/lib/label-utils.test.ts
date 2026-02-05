import { describe, it, expect } from 'vitest';
import {
  looksLikeCSS,
  looksLikeConcatenated,
  splitConcatenatedWords,
  cleanLabel,
  generateStepDescription,
  generateNavigationDescription,
  generateTabChangeDescription,
} from './label-utils';

describe('looksLikeCSS', () => {
  it('detects CSS block syntax', () => {
    expect(looksLikeCSS('{ overflow: hidden }')).toBe(true);
  });

  it('detects class definitions', () => {
    expect(looksLikeCSS('.class-name { display: flex }')).toBe(true);
  });

  it('detects ID definitions', () => {
    expect(looksLikeCSS('#my-id { color: red }')).toBe(true);
  });

  it('detects CSS values like hidden, none, flex', () => {
    expect(looksLikeCSS('overflow: hidden;')).toBe(true);
    expect(looksLikeCSS('display: none;')).toBe(true);
    expect(looksLikeCSS('display: flex')).toBe(true);
    expect(looksLikeCSS('position: absolute')).toBe(true);
  });

  it('rejects normal text', () => {
    expect(looksLikeCSS('Click here to continue')).toBe(false);
    expect(looksLikeCSS('Submit')).toBe(false);
    expect(looksLikeCSS('Hello World')).toBe(false);
  });

  it('detects CSS property patterns', () => {
    expect(looksLikeCSS('overflow: scroll')).toBe(true);
    expect(looksLikeCSS('display: grid')).toBe(true);
    expect(looksLikeCSS('position: relative')).toBe(true);
  });
});

describe('looksLikeConcatenated', () => {
  it('detects concatenated words with multiple capitals', () => {
    expect(looksLikeConcatenated('ModifierPartagerSupprimer')).toBe(true);
  });

  it('rejects short text even with capitals', () => {
    expect(looksLikeConcatenated('HelloWorld')).toBe(false);
  });

  it('rejects text with spaces', () => {
    expect(looksLikeConcatenated('Hello World Again Today')).toBe(false);
  });

  it('rejects text with fewer than 3 capitals', () => {
    expect(looksLikeConcatenated('Helloworld')).toBe(false);
    expect(looksLikeConcatenated('helloworldagain')).toBe(false);
  });

  it('detects long camelCase strings', () => {
    expect(looksLikeConcatenated('SaveEditDeleteConfirmCancel')).toBe(true);
  });
});

describe('splitConcatenatedWords', () => {
  it('splits camelCase into words', () => {
    expect(splitConcatenatedWords('ModifierPartagerSupprimer')).toBe(
      'Modifier Partager Supprimer'
    );
  });

  it('handles consecutive capitals', () => {
    expect(splitConcatenatedWords('XMLParser')).toBe('XML Parser');
  });

  it('handles single word', () => {
    expect(splitConcatenatedWords('hello')).toBe('hello');
  });

  it('splits mixed case correctly', () => {
    expect(splitConcatenatedWords('saveAsNewFile')).toBe('save As New File');
  });
});

describe('cleanLabel', () => {
  it('returns empty string for null/undefined', () => {
    expect(cleanLabel(null)).toBe('');
    expect(cleanLabel(undefined)).toBe('');
    expect(cleanLabel('')).toBe('');
  });

  it('normalizes whitespace', () => {
    expect(cleanLabel('  hello   world  ')).toBe('hello world');
  });

  it('removes newlines and tabs', () => {
    expect(cleanLabel('hello\nworld\ttab')).toBe('hello world tab');
  });

  it('returns empty string for CSS-like content', () => {
    expect(cleanLabel('{ overflow: hidden }')).toBe('');
    expect(cleanLabel('display: flex')).toBe('');
  });

  it('splits concatenated words', () => {
    expect(cleanLabel('ModifierPartagerSupprimer')).toBe(
      'Modifier Partager Supprimer'
    );
  });

  it('truncates to MAX_LABEL_LENGTH (60)', () => {
    const longText = 'a'.repeat(100);
    expect(cleanLabel(longText).length).toBe(60);
  });
});

describe('generateStepDescription', () => {
  it('returns null for null/undefined element info', () => {
    expect(generateStepDescription(null)).toBeNull();
    expect(generateStepDescription(undefined)).toBeNull();
  });

  it('generates click description with label text', () => {
    const result = generateStepDescription({ text: 'Submit' }, 'click');
    expect(result).toBe('Click on <strong>Submit</strong>');
  });

  it('escapes HTML in label text', () => {
    const result = generateStepDescription({ text: '<script>alert("xss")</script>' }, 'click');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });

  it('uses role as fallback when text is empty', () => {
    const result = generateStepDescription({ role: 'button' }, 'click');
    expect(result).toBe('Click on <strong>button</strong>');
  });

  it('uses actionableTag as fallback', () => {
    const result = generateStepDescription({ actionableTag: 'BUTTON' }, 'click');
    expect(result).toBe('Click on <strong>button</strong>');
  });

  it('uses tag as last resort', () => {
    const result = generateStepDescription({ tag: 'A' }, 'click');
    expect(result).toBe('Click on <strong>link</strong>');
  });

  it('returns label text directly for non-click actions', () => {
    const result = generateStepDescription({ text: 'Home Page' }, 'navigation');
    expect(result).toBe('Home Page');
  });

  it('returns null when no usable info exists', () => {
    const result = generateStepDescription({});
    expect(result).toBeNull();
  });

  it('cleans CSS-like text and falls back', () => {
    const result = generateStepDescription(
      { text: 'display: flex', tag: 'DIV' },
      'click'
    );
    expect(result).toBe('Click on <strong>element</strong>');
  });
});

describe('generateNavigationDescription', () => {
  it('returns null for empty URL', () => {
    expect(generateNavigationDescription('')).toBeNull();
  });

  it('generates description from valid URL', () => {
    const result = generateNavigationDescription('https://example.com/settings');
    expect(result).toBe(
      'Navigate to <strong>example.com/settings</strong>'
    );
  });

  it('handles root path', () => {
    const result = generateNavigationDescription('https://example.com/');
    expect(result).toBe('Navigate to <strong>example.com</strong>');
  });

  it('handles invalid URL gracefully', () => {
    const result = generateNavigationDescription('not-a-url');
    expect(result).toBe('Navigate to <strong>not-a-url</strong>');
  });

  it('escapes HTML in URL', () => {
    // URL constructor encodes angle brackets in path, so test with an invalid URL
    const result = generateNavigationDescription('<script>alert(1)</script>');
    expect(result).toContain('&lt;script&gt;');
    expect(result).not.toContain('<script>');
  });
});

describe('generateTabChangeDescription', () => {
  it('returns null when both title and url are null/undefined', () => {
    expect(generateTabChangeDescription(null, null)).toBeNull();
    expect(generateTabChangeDescription(undefined, undefined)).toBeNull();
  });

  it('uses tab title when available', () => {
    const result = generateTabChangeDescription('My Tab', null);
    expect(result).toBe('Switch to <strong>My Tab</strong>');
  });

  it('falls back to URL hostname when title is empty', () => {
    const result = generateTabChangeDescription(
      null,
      'https://example.com/page'
    );
    expect(result).toBe('Switch to <strong>example.com</strong>');
  });

  it('falls back to raw URL when parsing fails', () => {
    const result = generateTabChangeDescription(null, 'not-a-url');
    expect(result).toBe('Switch to <strong>not-a-url</strong>');
  });

  it('cleans the tab title', () => {
    const result = generateTabChangeDescription('  My  Tab  ', null);
    expect(result).toBe('Switch to <strong>My Tab</strong>');
  });

  it('skips CSS-like title and falls back to URL', () => {
    const result = generateTabChangeDescription(
      'display: flex',
      'https://example.com'
    );
    expect(result).toBe('Switch to <strong>example.com</strong>');
  });
});
