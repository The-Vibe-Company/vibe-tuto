import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { validateApiToken } from './api-token';

/** Bearer credentials take precedence: an invalid token never falls back to cookies. */
export async function resolveRequestUser(request: Request) {
  if (request.headers.has('authorization')) {
    const userId = await validateApiToken(request);
    return userId ? { userId, supabase: createAdminClient() } : null;
  }
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  return user && !error ? { userId: user.id, supabase } : null;
}
export type RequestUser = NonNullable<Awaited<ReturnType<typeof resolveRequestUser>>>;
