import { vi } from 'vitest';

type QueryResult = { data: unknown; error: unknown };
type StorageResult = { data: unknown; error: unknown };

interface QueryOverride {
  data?: unknown;
  error?: unknown;
}

interface StorageOverrides {
  signedUrl?: StorageResult;
  download?: StorageResult;
  upload?: StorageResult;
  list?: StorageResult;
  remove?: StorageResult;
}

interface MockSupabaseOverrides {
  user?: { id: string; email?: string } | null;
  authError?: object | null;
  queries?: Record<string, QueryOverride>;
  storage?: StorageOverrides;
}

/**
 * Creates a chainable query builder mock for Supabase table operations.
 * Supports: select, eq, in, order, single, limit, gte, lte, neq, range, insert, update, delete
 */
function createQueryBuilder(result: QueryResult): Record<string, ReturnType<typeof vi.fn>> {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {};

  const chainMethods = ['select', 'eq', 'in', 'order', 'limit', 'gte', 'lte', 'neq', 'range'];

  for (const method of chainMethods) {
    builder[method] = vi.fn().mockReturnValue(builder);
  }

  // Terminal methods that resolve
  builder.single = vi.fn().mockResolvedValue(result);

  // Make the builder itself thenable so `await supabase.from('x').select().eq()` works
  builder.then = vi.fn((resolve: (value: QueryResult) => void) => resolve(result));

  return builder;
}

/**
 * Creates a mock Supabase client with configurable auth, queries, and storage.
 *
 * @example
 * ```ts
 * const client = createMockSupabaseClient({
 *   user: { id: 'user-1' },
 *   queries: {
 *     tutorials: { data: [{ id: 't1' }], error: null },
 *     steps: { data: [], error: null },
 *   },
 *   storage: {
 *     signedUrl: { data: { signedUrl: 'https://...' }, error: null },
 *   },
 * });
 * ```
 */
export function createMockSupabaseClient(overrides: MockSupabaseOverrides = {}) {
  const { user = null, authError = null, queries = {}, storage = {} } = overrides;

  // Build per-table query builders
  const tableBuilders = new Map<string, Record<string, ReturnType<typeof vi.fn>>>();
  for (const [table, override] of Object.entries(queries)) {
    const result: QueryResult = {
      data: override.data ?? null,
      error: override.error ?? null,
    };
    tableBuilders.set(table, createQueryBuilder(result));
  }

  // Default query builder for unknown tables
  const defaultBuilder = createQueryBuilder({ data: null, error: null });

  const mockFrom = vi.fn((table: string) => {
    const builder = tableBuilders.get(table) || { ...defaultBuilder };

    // For insert/update/delete, return new chainable builders that resolve to the table result
    const tableResult: QueryResult = queries[table]
      ? { data: queries[table].data ?? null, error: queries[table].error ?? null }
      : { data: null, error: null };

    return {
      ...builder,
      insert: vi.fn().mockReturnValue(createQueryBuilder(tableResult)),
      update: vi.fn().mockReturnValue(createQueryBuilder(tableResult)),
      delete: vi.fn().mockReturnValue(createQueryBuilder(tableResult)),
    };
  });

  // Storage mock
  const storageMock = {
    from: vi.fn().mockReturnValue({
      createSignedUrl: vi.fn().mockResolvedValue(
        storage.signedUrl ?? { data: null, error: null }
      ),
      download: vi.fn().mockResolvedValue(
        storage.download ?? { data: null, error: null }
      ),
      upload: vi.fn().mockResolvedValue(
        storage.upload ?? { data: null, error: null }
      ),
      list: vi.fn().mockResolvedValue(
        storage.list ?? { data: null, error: null }
      ),
      remove: vi.fn().mockResolvedValue(
        storage.remove ?? { data: null, error: null }
      ),
    }),
  };

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user },
        error: authError,
      }),
    },
    from: mockFrom,
    storage: storageMock,
  };
}

/**
 * Creates a mock client with a valid authenticated user.
 */
export function createAuthenticatedClient(userId = 'user-123', email = 'test@example.com') {
  return createMockSupabaseClient({ user: { id: userId, email } });
}

/**
 * Creates a mock client with no authenticated user.
 */
export function createUnauthenticatedClient() {
  return createMockSupabaseClient({
    user: null,
    authError: { message: 'Not authenticated' },
  });
}

/**
 * Sets up the Supabase mock module and returns the mocked createClient function.
 * Must be called at the top level of the test file (alongside vi.mock).
 *
 * @example
 * ```ts
 * vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
 * import { createClient } from '@/lib/supabase/server';
 * const mockCreateClient = vi.mocked(createClient);
 * ```
 */
export function setupSupabaseMock() {
  // This is a convenience that documents the pattern.
  // Due to hoisting, vi.mock must be called at the module top level.
  // This function returns a helper to configure the mock after import.
  return {
    /**
     * After importing `createClient`, call this with `vi.mocked(createClient)` to get
     * a typed mock function you can configure per-test.
     */
    configureMock: <T extends (...args: unknown[]) => unknown>(mockedFn: ReturnType<typeof vi.mocked<T>>) => mockedFn,
  };
}
