import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";
import { getSupabaseConfig } from "./config";

export function createClient() {
  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient<Database>(url, anonKey);
}
