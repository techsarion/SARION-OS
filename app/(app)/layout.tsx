import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { roleLabel } from '@/lib/roles';
import { getChromeData } from '@/lib/server/data/workspace';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const chrome = user
    ? await getChromeData(user.id)
    : { notifications: [], myOpenTaskCount: 0, recentActivity: [] };

  const quickPerms = user
    ? {
        task: can(user.role, 'task:create'),
        meeting: can(user.role, 'meeting:create'),
        target: can(user.role, 'target:create'),
        account: can(user.role, 'user:create'),
      }
    : undefined;

  return (
    <AppShell
      userName={user?.fullName ?? 'Sarion Team'}
      userRole={user ? roleLabel(user.role) : 'Team Member'}
      avatarUrl={user?.avatarUrl ?? null}
      accountHref="/settings"
      notifications={chrome.notifications}
      quickPerms={quickPerms}
      navCounts={{ '/tasks': chrome.myOpenTaskCount }}
      recentActivity={chrome.recentActivity}
    >
      {children}
      <Toaster />
    </AppShell>
  );
}
