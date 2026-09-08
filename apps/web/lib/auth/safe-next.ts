/** Keep post-login navigation inside this app; reject URL and backslash ambiguities. */
export function safeNext(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\x00-\x20]/.test(value)) return '/dashboard';
  try {
    const decoded = decodeURIComponent(value);
    if (decoded.startsWith('//') || /[\\\x00-\x1f]/.test(decoded)) return '/dashboard';
    const url = new URL(value, 'https://captuto.invalid');
    if (url.origin !== 'https://captuto.invalid') return '/dashboard';
    return `${url.pathname}${url.search}${url.hash}`;
  } catch { return '/dashboard'; }
}
