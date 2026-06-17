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
        account: can(user.role, 'user:create'),
        dept: can(user.role, 'dept:create'),
        team: can(user.role, 'team:create'),
      }
    : undefined;

  return (
    <AppShell
      userName={user?.fullName ?? 'Sarion Team'}
      userRole={user ? roleLabel(user.role) : 'Team Member'}
      accountHref={user ? `/employees/${user.id}` : undefined}
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
