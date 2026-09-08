import { expect, it } from 'vitest';
import { safeNext } from './safe-next';

it('preserves the desktop connection through login', () => {
  expect(safeNext('/connect/desktop?id=123')).toBe('/connect/desktop?id=123');
});
it.each([undefined, null, '', 'https://evil.example', '//evil.example', '/\\evil.example', '/%2fexample.com', '/%5cexample.com', '/\n/evil.example', '/%0d%0aLocation:evil', '/%'])('rejects unsafe login destinations: %s', value => {
  expect(safeNext(value)).toBe('/dashboard');
});
