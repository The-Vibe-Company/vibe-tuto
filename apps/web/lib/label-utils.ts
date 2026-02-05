/**
 * Server-side label utilities for step generation
 *
 * Provides label cleanup and description generation for tutorial steps.
 */

const MAX_LABEL_LENGTH = 60;

/**
 * Check if text looks like CSS (class names, properties, etc.)
 */
export function looksLikeCSS(text: string): boolean {
  const cssPatterns = [
    /\{[^}]*\}/,           // CSS blocks like { overflow: hidden }
    /^\.[\w-]+\s*\{/,      // Class definitions like .class-name {
    /^#[\w-]+\s*\{/,       // ID definitions like #id-name {
    /:\s*(hidden|visible|auto|none|block|inline|flex|grid)\s*[;}]?/i,
    /overflow:\s*/i,
    /display:\s*/i,
    /position:\s*/i,
    /^[\w-]+\s*:\s*[\w-]+\s*[;}]/, // CSS property: value with terminator
  ];

  return cssPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if text looks like concatenated words (multiple labels merged)
 * e.g., "ModifierPartagerSupprimer" should be detected
 */
export function looksLikeConcatenated(text: string): boolean {
  // Check for camelCase-like patterns with multiple capitals
  // Allow single capital at start, but flag multiple
  const capitalCount = (text.match(/[A-Z]/g) || []).length;
  const hasNoSpaces = !/\s/.test(text);

  // If we have 3+ capitals and no spaces in a word > 15 chars, likely concatenated
  if (capitalCount >= 3 && hasNoSpaces && text.length > 15) {
    return true;
  }

  return false;
}

/**
 * Try to split concatenated words into separate words
 * e.g., "ModifierPartagerSupprimer" -> "Modifier Partager Supprimer"
 */
export function splitConcatenatedWords(text: string): string {
  // Insert space before each capital letter (except the first)
  return text
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2');
}

/**
 * Clean a label by normalizing whitespace and removing invalid content
 */
export function cleanLabel(text: string | null | undefined): string {
  if (!text) return '';

  let cleaned = text
    .replace(/\s+/g, ' ')      // Normalize whitespace
    .replace(/[\n\r\t]/g, ' ') // Remove newlines/tabs
    .trim();

  // Check for CSS-like content
  if (looksLikeCSS(cleaned)) {
    return '';
  }

  // Check for concatenated words and try to split them
  if (looksLikeConcatenated(cleaned)) {
    cleaned = splitConcatenatedWords(cleaned);
  }

  return cleaned.substring(0, MAX_LABEL_LENGTH);
}

/**
 * Element info structure from capture
 */
export interface ElementInfo {
  tag?: string;
  text?: string;
  id?: string;
  className?: string;
  role?: string;
  actionableTag?: string;
  tabTitle?: string;
}

/**
 * Generate a human-readable step description from element info
 */
export function generateStepDescription(
  elementInfo: ElementInfo | null | undefined,
  actionType: 'click' | 'navigation' = 'click'
): string | null {
  if (!elementInfo) return null;

  // Get the label text
  let label = cleanLabel(elementInfo.text);

  // If label is empty or invalid, try to generate from other info
  if (!label) {
    // Try to use role if available
    if (elementInfo.role) {
      label = elementInfo.role;
    }
    // Try to use actionable tag
    else if (elementInfo.actionableTag) {
      label = formatTagName(elementInfo.actionableTag);
    }
    // Use the original tag as last resort
    else if (elementInfo.tag) {
      label = formatTagName(elementInfo.tag);
    }
  }

  if (!label) return null;

  // Format the description based on action type
  if (actionType === 'click') {
    return `Click on <strong>${escapeHtml(label)}</strong>`;
  }

  return label;
}

/**
 * Format a tag name into a readable string
 */
function formatTagName(tag: string): string {
  const tagNameMap: Record<string, string> = {
    'BUTTON': 'button',
    'A': 'link',
    'INPUT': 'input field',
    'SELECT': 'dropdown',
    'TEXTAREA': 'text area',
    'IMG': 'image',
    'DIV': 'element',
    'SPAN': 'element',
    'LI': 'list item',
    'NAV': 'navigation',
    'HEADER': 'header',
    'FOOTER': 'footer',
    'MAIN': 'main content',
    'ASIDE': 'sidebar',
    'ARTICLE': 'article',
    'SECTION': 'section',
    'FORM': 'form',
    'TABLE': 'table',
    'TR': 'table row',
    'TD': 'table cell',
    'TH': 'table header',
  };

  return tagNameMap[tag.toUpperCase()] || tag.toLowerCase();
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  const htmlEntities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };

  return text.replace(/[&<>"']/g, char => htmlEntities[char] || char);
}

/**
 * Generate navigation description from URL
 */
export function generateNavigationDescription(url: string): string | null {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const path = parsed.pathname !== '/' ? parsed.pathname : '';
    const pageDesc = parsed.hostname + path;
    return `Navigate to <strong>${escapeHtml(pageDesc)}</strong>`;
  } catch {
    // If URL parsing fails, use the raw URL
    return `Navigate to <strong>${escapeHtml(url)}</strong>`;
  }
}

/**
 * Generate tab change description from tab title and URL
 */
export function generateTabChangeDescription(
  tabTitle: string | null | undefined,
  url: string | null | undefined
): string | null {
  if (tabTitle) {
    const cleanTitle = cleanLabel(tabTitle);
    if (cleanTitle) {
      return `Switch to <strong>${escapeHtml(cleanTitle)}</strong>`;
    }
  }

  // Fallback to URL hostname if no title
  if (url) {
    try {
      const parsed = new URL(url);
      return `Switch to <strong>${escapeHtml(parsed.hostname)}</strong>`;
    } catch {
      return `Switch to <strong>${escapeHtml(url)}</strong>`;
    }
  }

  return null;
}
