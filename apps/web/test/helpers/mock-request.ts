/**
 * Creates a Request with a JSON body.
 */
export function createJsonRequest(
  url: string,
  method: string,
  body: object
): Request {
  return new Request(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Cookie: 'session=test-cookie',
    },
    body: JSON.stringify(body),
  });
}

/**
 * Creates a GET Request with optional search params.
 */
export function createGetRequest(
  url: string,
  params?: Record<string, string>
): Request {
  const urlObj = new URL(url);
  if (params) {
    for (const [key, value] of Object.entries(params)) {
      urlObj.searchParams.set(key, value);
    }
  }
  return new Request(urlObj.toString(), {
    method: 'GET',
    headers: {
      Cookie: 'session=test-cookie',
    },
  });
}

/**
 * Creates a Request with a FormData body.
 */
export function createFormDataRequest(
  url: string,
  formData: FormData
): Request {
  return new Request(url, {
    method: 'POST',
    body: formData,
  });
}

/**
 * Wraps route params into the Next.js dynamic route format: `{ params: Promise<T> }`.
 *
 * @example
 * ```ts
 * const context = wrapParams({ id: 'abc-123' });
 * // context = { params: Promise.resolve({ id: 'abc-123' }) }
 * ```
 */
export function wrapParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}
