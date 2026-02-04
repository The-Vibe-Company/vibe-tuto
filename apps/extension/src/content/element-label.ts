/**
 * Element Labeling Utility
 *
 * Provides intelligent element labeling following W3C Accessible Name Computation standards.
 * Used to generate human-readable labels for clicked elements during tutorial recording.
 */

const MAX_LABEL_LENGTH = 60;

// HTML tags that are considered interactive/actionable
const ACTIONABLE_TAGS = new Set([
  'BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA', 'LABEL',
  'SUMMARY', 'DETAILS', 'OPTION'
]);

// ARIA roles that indicate interactive elements
const ACTIONABLE_ROLES = new Set([
  'button', 'link', 'checkbox', 'radio', 'menuitem', 'menuitemcheckbox',
  'menuitemradio', 'tab', 'option', 'switch', 'treeitem', 'gridcell',
  'row', 'listitem', 'combobox', 'searchbox', 'slider', 'spinbutton',
  'textbox'
]);

/**
 * Check if an element is considered actionable/interactive
 */
function isActionableElement(element: HTMLElement): boolean {
  // Check tag name
  if (ACTIONABLE_TAGS.has(element.tagName)) {
    return true;
  }

  // Check ARIA role
  const role = element.getAttribute('role');
  if (role && ACTIONABLE_ROLES.has(role)) {
    return true;
  }

  // Check for click handlers (onclick attribute)
  if (element.hasAttribute('onclick')) {
    return true;
  }

  // Check for tabindex (making element focusable/interactive)
  const tabindex = element.getAttribute('tabindex');
  if (tabindex !== null && parseInt(tabindex, 10) >= 0) {
    return true;
  }

  // Check for common interactive data attributes
  if (element.hasAttribute('data-action') ||
      element.hasAttribute('data-toggle') ||
      element.hasAttribute('data-dismiss')) {
    return true;
  }

  return false;
}

/**
 * Find the closest actionable ancestor element.
 * When clicking on nested elements (e.g., icon inside button),
 * traverse up to find the interactive element.
 */
export function findClosestActionableAncestor(element: HTMLElement): HTMLElement {
  let current: HTMLElement | null = element;
  let depth = 0;
  const maxDepth = 10; // Prevent infinite loops

  while (current && current !== document.body && depth < maxDepth) {
    if (isActionableElement(current)) {
      return current;
    }
    current = current.parentElement;
    depth++;
  }

  // Return original element if no actionable ancestor found
  return element;
}

/**
 * Extract only direct text content from an element (not from nested children).
 * This prevents capturing text from multiple nested elements.
 */
export function getDirectTextContent(element: HTMLElement): string {
  const textParts: string[] = [];

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent?.trim();
      if (text) {
        textParts.push(text);
      }
    }
  }

  return textParts.join(' ').trim();
}

/**
 * Get shallow text content - only from immediate children, not deep descendants.
 * Useful for elements like buttons with icon + text span.
 */
function getShallowTextContent(element: HTMLElement, maxDepth: number = 2): string {
  if (maxDepth <= 0) return '';

  const textParts: string[] = [];

  for (const node of element.childNodes) {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = (node as Text).textContent?.trim();
      if (text) {
        textParts.push(text);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      const childElement = node as HTMLElement;

      // Skip hidden elements
      if (childElement.hasAttribute('aria-hidden') &&
          childElement.getAttribute('aria-hidden') === 'true') {
        continue;
      }

      // Skip style and script elements
      if (['STYLE', 'SCRIPT', 'NOSCRIPT'].includes(childElement.tagName)) {
        continue;
      }

      // Skip SVG elements (usually icons, not text)
      if (childElement.tagName === 'SVG' ||
          (typeof SVGElement !== 'undefined' && childElement instanceof SVGElement)) {
        continue;
      }

      // Recurse with reduced depth
      const childText = getShallowTextContent(childElement, maxDepth - 1);
      if (childText) {
        textParts.push(childText);
      }
    }
  }

  return textParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * Clean and truncate a label string
 */
function cleanLabel(text: string): string {
  return text
    .replace(/\s+/g, ' ')  // Normalize whitespace
    .replace(/[\n\r\t]/g, ' ')  // Remove newlines/tabs
    .trim()
    .substring(0, MAX_LABEL_LENGTH);
}

/**
 * Check if text looks like CSS (class names, properties, etc.)
 */
function looksLikeCSS(text: string): boolean {
  // Check for CSS-like patterns
  const cssPatterns = [
    /\{[^}]*\}/,           // CSS blocks like { overflow: hidden }
    /^\.[\w-]+\s*\{/,      // Class definitions like .class-name {
    /^#[\w-]+\s*\{/,       // ID definitions like #id-name {
    /:\s*(hidden|visible|auto|none|block|inline|flex|grid)\s*[;}]?/i,  // CSS values
    /overflow:\s*/i,
    /display:\s*/i,
    /position:\s*/i,
  ];

  return cssPatterns.some(pattern => pattern.test(text));
}

/**
 * Get the accessible label for an element following ARIA priority order.
 *
 * Priority:
 * 1. aria-labelledby - References to other elements
 * 2. aria-label - Direct ARIA label
 * 3. title attribute
 * 4. alt attribute (for images)
 * 5. placeholder attribute (for inputs)
 * 6. value attribute (for buttons/inputs)
 * 7. Shallow text content
 * 8. Element tag name as fallback
 */
export function getElementLabel(element: HTMLElement): string {
  // First, find the closest actionable ancestor
  const target = findClosestActionableAncestor(element);

  // 1. Check aria-labelledby
  const labelledBy = target.getAttribute('aria-labelledby');
  if (labelledBy) {
    const labels = labelledBy
      .split(/\s+/)
      .map(id => document.getElementById(id)?.textContent?.trim())
      .filter((text): text is string => Boolean(text))
      .filter(text => !looksLikeCSS(text));

    if (labels.length > 0) {
      return cleanLabel(labels.join(' '));
    }
  }

  // 2. Check aria-label
  const ariaLabel = target.getAttribute('aria-label')?.trim();
  if (ariaLabel && !looksLikeCSS(ariaLabel)) {
    return cleanLabel(ariaLabel);
  }

  // 3. Check title attribute
  const title = target.getAttribute('title')?.trim();
  if (title && !looksLikeCSS(title)) {
    return cleanLabel(title);
  }

  // 4. For images: check alt attribute
  if (target.tagName === 'IMG') {
    const alt = target.getAttribute('alt')?.trim();
    if (alt && !looksLikeCSS(alt)) {
      return cleanLabel(alt);
    }
  }

  // Also check for images inside the target element
  const img = target.querySelector('img[alt]');
  if (img) {
    const imgAlt = img.getAttribute('alt')?.trim();
    if (imgAlt && !looksLikeCSS(imgAlt)) {
      return cleanLabel(imgAlt);
    }
  }

  // 5. For inputs: check placeholder
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const placeholder = target.getAttribute('placeholder')?.trim();
    if (placeholder && !looksLikeCSS(placeholder)) {
      return cleanLabel(placeholder);
    }
  }

  // 6. For buttons/inputs: check value
  if (target.tagName === 'INPUT' || target.tagName === 'BUTTON') {
    const value = target.getAttribute('value')?.trim();
    if (value && !looksLikeCSS(value)) {
      return cleanLabel(value);
    }
  }

  // 7. Get shallow text content (not full textContent)
  const shallowText = getShallowTextContent(target);
  if (shallowText && !looksLikeCSS(shallowText)) {
    return cleanLabel(shallowText);
  }

  // 8. Try direct text content as last resort
  const directText = getDirectTextContent(target);
  if (directText && !looksLikeCSS(directText)) {
    return cleanLabel(directText);
  }

  // 9. Fallback: use element tag name in a readable format
  const tagName = target.tagName.toLowerCase();
  const role = target.getAttribute('role');

  if (role) {
    return role;
  }

  // Map common tags to readable names
  const tagNameMap: Record<string, string> = {
    'button': 'button',
    'a': 'link',
    'input': 'input field',
    'select': 'dropdown',
    'textarea': 'text area',
    'img': 'image',
    'div': 'element',
    'span': 'element',
    'li': 'list item',
    'nav': 'navigation',
    'header': 'header',
    'footer': 'footer',
    'main': 'main content',
    'aside': 'sidebar',
    'article': 'article',
    'section': 'section',
  };

  return tagNameMap[tagName] || tagName;
}

/**
 * Get comprehensive element info for click capture
 *
 * @param element - The clicked HTML element
 * @returns Object with:
 *   - tag: The clicked element's tag name
 *   - text: Human-readable label following ARIA standards
 *   - id: Element ID if present
 *   - className: Element class names (handles SVG compatibility)
 *   - role: ARIA role attribute if present
 *   - actionableTag: Tag of closest interactive ancestor (if different from clicked element)
 */
export function getElementInfo(element: HTMLElement): {
  tag: string;
  text: string;
  id?: string;
  className?: string;
  role?: string;
  actionableTag?: string;
} {
  const actionableAncestor = findClosestActionableAncestor(element);
  const label = getElementLabel(element);

  // Handle SVG elements where className is SVGAnimatedString
  const className = typeof element.className === 'string'
    ? element.className
    : element.getAttribute?.('class') || undefined;

  return {
    tag: element.tagName,
    text: label,
    id: element.id || undefined,
    className: className || undefined,
    role: element.getAttribute('role') || undefined,
    // Include the actionable ancestor's tag if different
    actionableTag: actionableAncestor !== element ? actionableAncestor.tagName : undefined,
  };
}
