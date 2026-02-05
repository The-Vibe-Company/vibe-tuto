import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary'],
      include: ['app/api/**/*.ts', 'lib/**/*.ts', 'middleware.ts'],
      exclude: ['**/*.test.ts', '**/*.d.ts', 'lib/supabase/types.ts', 'lib/supabase/database.types.ts', 'node_modules/**'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './'),
    },
  },
});
