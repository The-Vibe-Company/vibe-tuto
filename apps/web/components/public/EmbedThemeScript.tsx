/**
 * Inline blocking script that applies dark mode class before the page renders.
 * This prevents a flash of wrong theme.
 * - ?theme=dark forces dark mode
 * - ?theme=light forces light mode
 * - No param: auto-detects from prefers-color-scheme
 */
export function EmbedThemeScript({ theme }: { theme?: string }) {
  if (theme === 'dark' || theme === 'light') {
    // Server-side: we already know the theme, apply it as a class on html
    return (
      <script
        dangerouslySetInnerHTML={{
          __html: theme === 'dark'
            ? `document.documentElement.classList.add('dark')`
            : `document.documentElement.classList.remove('dark')`,
        }}
      />
    );
  }

  // Auto-detect: blocking script reads prefers-color-scheme before paint
  return (
    <script
      dangerouslySetInnerHTML={{
        __html: `(function(){if(window.matchMedia('(prefers-color-scheme:dark)').matches){document.documentElement.classList.add('dark')}})()`,
      }}
    />
  );
}
