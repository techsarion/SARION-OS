import { requireUser } from '@/lib/auth';
import { getMyCheckIn, getTeamCheckIns } from '@/lib/server/data/checkins';
import { CheckinKind } from '@/types/enums';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { CheckInForm } from '@/components/checkins/checkin-form';
import { CheckInFeed } from '@/components/checkins/checkin-feed';
import { Moon } from 'lucide-react';

export default async function EndOfDayPage() {
  const user = await requireUser();
  const [mine, team] = await Promise.all([
    getMyCheckIn(user.id, CheckinKind.EOD),
    getTeamCheckIns(CheckinKind.EOD),
  ]);
  const others = team.filter((c) => c.userId !== user.id);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader title="End-of-Day Update" subtitle="Wrap up: what got done, what's carrying over" />

      <Card>
        <CardHeader><CardTitle>Your update</CardTitle></CardHeader>
        <CardContent>
          <CheckInForm kind="EOD" existing={mine} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-overline uppercase text-text-secondary">Team updates today</h2>
        {others.length === 0 ? (
          <EmptyState icon={Moon} title="No end-of-day updates yet" description="Your teammates' wrap-ups will appear here." />
        ) : (
          <CheckInFeed checkIns={others} kind="EOD" />
        )}
      </section>
    </div>
  );
}
