import { createClient } from '@/lib/supabase/server';
import { DashboardSidebar } from '@/components/dashboard/DashboardSidebar';
import { DashboardTopBar } from '@/components/dashboard/DashboardTopBar';
import { ExtensionAuthSync } from '@/components/ExtensionAuthSync';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const userEmail = session?.user?.email || '';
  const handle = userEmail.split('@')[0] || 'workspace';
  const workspaceInitials = handle.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen bg-stone-50">
      <ExtensionAuthSync />
      <div className="flex">
        <DashboardSidebar
          workspaceName={handle.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
          workspaceRole="Personal"
          workspaceInitials={workspaceInitials}
        />
        <div className="flex min-h-screen min-w-0 flex-1 flex-col">
          <DashboardTopBar userEmail={userEmail} />
          <main className="flex-1">{children}</main>
        </div>
      </div>
    </div>
  );
}
