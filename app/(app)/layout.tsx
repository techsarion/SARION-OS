import { AppShell } from '@/components/shell/app-shell';
import { Toaster } from '@/components/ui/toaster';
import { getCurrentUser } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { roleLabel } from '@/lib/roles';
import { getChromeData } from '@/lib/server/data/workspace';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  // The app shell wraps every authenticated page, so a failure here would take
  // down the whole app with the global error boundary. Degrade gracefully:
  // render the shell with empty chrome and log the cause (visible in server logs)
  // rather than white-screening every route.
  let user: Awaited<ReturnType<typeof getCurrentUser>> = null;
  try {
    user = await getCurrentUser();
  } catch (err) {
    console.error('[app layout] getCurrentUser failed:', err);
  }

  let chrome = { notifications: [], myOpenTaskCount: 0, recentActivity: [] } as Awaited<ReturnType<typeof getChromeData>>;
  if (user) {
    try {
      chrome = await getChromeData(user.id);
    } catch (err) {
      console.error('[app layout] getChromeData failed:', err);
    }
  }

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
