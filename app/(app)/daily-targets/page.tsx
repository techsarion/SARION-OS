import { requireUser } from '@/lib/auth';
import { getTargets } from '@/lib/server/data/targets';
import { getPeople } from '@/lib/server/data/people';
import { PageHeader } from '@/components/page-header';
import { TargetsView } from '@/components/targets/targets-view';
import { TargetPeriod, TargetScope } from '@/types/enums';

export default async function DailyTargetsPage() {
  const user = await requireUser();
  const [targets, people] = await Promise.all([
    getTargets(TargetPeriod.DAILY, TargetScope.PERSONAL),
    getPeople(),
  ]);
  return (
    <div className="mx-auto max-w-[1100px]">
      <PageHeader title="Daily Targets" subtitle="What each of us is getting done today" />
      <TargetsView
        targets={targets}
        people={people.map((p) => ({ id: p.id, full_name: p.full_name }))}
        currentUserId={user.id}
        period={TargetPeriod.DAILY}
        scope={TargetScope.PERSONAL}
        variant="status"
      />
    </div>
  );
}
