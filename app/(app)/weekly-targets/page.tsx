import { requireUser } from '@/lib/auth';
import { getTargets } from '@/lib/server/data/targets';
import { getPeople } from '@/lib/server/data/people';
import { PageHeader } from '@/components/page-header';
import { TargetsView } from '@/components/targets/targets-view';
import { TargetPeriod, TargetScope } from '@/types/enums';

export default async function WeeklyTargetsPage() {
  const user = await requireUser();
  const [targets, people] = await Promise.all([
    getTargets(TargetPeriod.WEEKLY, TargetScope.PERSONAL),
    getPeople(),
  ]);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Weekly Targets" subtitle="Progress against this week's goals" />
      <TargetsView
        targets={targets}
        people={people.map((p) => ({ id: p.id, full_name: p.full_name }))}
        currentUserId={user.id}
        period={TargetPeriod.WEEKLY}
        scope={TargetScope.PERSONAL}
        variant="progress"
      />
    </div>
  );
}
