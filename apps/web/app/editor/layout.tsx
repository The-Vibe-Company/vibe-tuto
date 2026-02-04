import { createClient } from '@/lib/supabase/server';
import { Header } from '@/components/dashboard/Header';

export default async function EditorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Middleware already validated auth and redirects if not authenticated
  // Use getSession() which reads from cookies (no network call) instead of getUser()
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  // Session is guaranteed by middleware, but fallback for safety
  const userEmail = session?.user?.email || '';

  return (
    <div className="min-h-screen bg-white">
      <Header userEmail={userEmail} />
      {children}
    </div>
  );
}
