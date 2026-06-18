import { requireUser } from '@/lib/auth';
import { getStartupDashboard } from '@/lib/server/data/dashboard';
import { getTeamCapacity } from '@/lib/server/data/capacity';
import { StartupDashboard } from '@/components/dashboard/startup-dashboard';
import { TeamCapacity } from '@/components/dashboard/team-capacity';

/**
 * One focused execution dashboard for the whole team — TODAY / THIS WEEK /
 * THIS MONTH / UPCOMING. All three members are admins, so everyone gets the
 * same company-wide view.
 */
export default async function DashboardPage() {
  const user = await requireUser();
  const firstName = user.fullName?.split(' ')[0] ?? 'there';
  const [data, capacity] = await Promise.all([getStartupDashboard(user.id), getTeamCapacity()]);
  return (
    <div className="mx-auto max-w-[1320px] space-y-6">
      <StartupDashboard firstName={firstName} data={data} />
      <div className="mx-auto max-w-[1320px]">
        <h2 className="mb-3 text-overline uppercase text-text-secondary">Team Capacity</h2>
        <TeamCapacity rows={capacity} />
      </div>
    </div>
  );
}
