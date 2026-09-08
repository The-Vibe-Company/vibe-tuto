import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { connectionIdSchema } from '@/lib/desktop/connect';
import { DesktopConsent } from './DesktopConsent';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Connect Captuto for Mac', robots: 'noindex, nofollow', referrer: 'no-referrer' as const };

export default async function DesktopConnectPage({ searchParams }: { searchParams: { id?: string } }) {
  const id = searchParams.id;
  if (!connectionIdSchema.safeParse(id).success) return <DesktopConsent expired />;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/connect/desktop?id=${id}`)}`);
  const { data } = await createAdminClient().from('desktop_connections').select('id,user_id,expires_at').eq('id', id!).single();
  if (!data || Date.parse(data.expires_at) <= Date.now()) return <DesktopConsent expired />;
  if (data.user_id && data.user_id !== user.id) return <DesktopConsent claimed />;
  return <DesktopConsent id={data.id} email={user.email || 'your account'} alreadyApproved={data.user_id === user.id} />;
}
