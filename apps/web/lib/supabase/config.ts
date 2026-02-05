export function getSupabaseConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    throw new Error(
      "Your project's URL and Key are required to create a Supabase client! " +
      "Check your Supabase project's API settings to find these values " +
      "https://supabase.com/dashboard/project/_/settings/api"
    );
  }

  return { url, anonKey };
}
