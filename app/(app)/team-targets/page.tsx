import { requireUser } from '@/lib/auth';
import { getTeamTargets } from '@/lib/server/data/targets';
import { getPeople } from '@/lib/server/data/people';
import { PageHeader } from '@/components/page-header';
import { TargetsView } from '@/components/targets/targets-view';
import { TargetPeriod, TargetScope } from '@/types/enums';

export default async function TeamTargetsPage() {
  const user = await requireUser();
  const [targets, people] = await Promise.all([getTeamTargets(), getPeople()]);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Team Targets" subtitle="Shared company goals we're driving together" />
      <TargetsView
        targets={targets}
        people={people.map((p) => ({ id: p.id, full_name: p.full_name }))}
        currentUserId={user.id}
        period={TargetPeriod.MONTHLY}
        scope={TargetScope.TEAM}
        variant="progress"
      />
    </div>
  );
}
