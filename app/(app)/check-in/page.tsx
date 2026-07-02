import { requireUser } from '@/lib/auth';
import { getDailyWorkspaceData } from '@/lib/server/data/daily-workspace';
import { PageHeader } from '@/components/page-header';
import { DailyWorkspace } from '@/components/daily/daily-workspace';

export const metadata = { title: 'Daily Workspace — Sarion Team OS' };

export default async function DailyWorkspacePage() {
  const user = await requireUser();
  const data = await getDailyWorkspaceData(user.id);

  return (
    <div className="mx-auto max-w-[1100px] fade-up">
      <PageHeader title="Daily Workspace" subtitle="Plan, execute, and wrap up your entire day from one screen." />
      <DailyWorkspace data={data} userName={user.fullName} />
    </div>
  );
}
