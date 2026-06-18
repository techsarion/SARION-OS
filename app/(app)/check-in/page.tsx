import { requireUser } from '@/lib/auth';
import { getMyCheckIn, getTeamCheckIns } from '@/lib/server/data/checkins';
import { CheckinKind } from '@/types/enums';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { CheckInForm } from '@/components/checkins/checkin-form';
import { CheckInFeed } from '@/components/checkins/checkin-feed';
import { Sunrise } from 'lucide-react';

export default async function CheckInPage() {
  const user = await requireUser();
  const [mine, team] = await Promise.all([
    getMyCheckIn(user.id, CheckinKind.MORNING),
    getTeamCheckIns(CheckinKind.MORNING),
  ]);
  const others = team.filter((c) => c.userId !== user.id);

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader title="Daily Check-In" subtitle="Set your focus for the day and flag any blockers" />

      <Card>
        <CardHeader><CardTitle>Your check-in</CardTitle></CardHeader>
        <CardContent>
          <CheckInForm kind="MORNING" existing={mine} />
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-overline uppercase text-text-secondary">Team check-ins today</h2>
        {others.length === 0 ? (
          <EmptyState icon={Sunrise} title="No one else has checked in yet" description="Your teammates' focus for the day will appear here." />
        ) : (
          <CheckInFeed checkIns={others} kind="MORNING" />
        )}
      </section>
    </div>
  );
}
