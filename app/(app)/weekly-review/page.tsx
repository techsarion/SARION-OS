import Link from 'next/link';
import { requireUser } from '@/lib/auth';
import { getWeeklyReviewContext, getTeamWeeklyReviews } from '@/lib/server/data/weekly-review';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { WeeklyReviewForm } from '@/components/weekly-review/weekly-review-form';
import { Target, ClipboardCheck } from 'lucide-react';

export default async function WeeklyReviewPage() {
  const user = await requireUser();
  const [ctx, team] = await Promise.all([getWeeklyReviewContext(user.id), getTeamWeeklyReviews()]);
  const others = team.filter((r) => r.userId !== user.id);
  const carrySeed = ctx.carryForwardTasks.map((t) => `• ${t.title}`).join('\n');
  const weekLabel = new Date(ctx.weekStart).toLocaleDateString(undefined, { month: 'long', day: 'numeric' });

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <PageHeader title="Weekly Review" subtitle={`Week of ${weekLabel}`} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>This week&apos;s targets</CardTitle>
            <Badge tone={ctx.targetCompletion >= 100 ? 'success' : 'accent'}>{ctx.targetCompletion}% avg</Badge>
          </CardHeader>
          <CardContent>
            {ctx.weeklyTargets.length === 0 ? (
              <EmptyState icon={Target} title="No weekly targets" description={'Set some on the Weekly Targets page.'}
                action={<Link href="/weekly-targets" className="text-caption text-accent hover:underline">Add weekly targets →</Link>} />
            ) : (
              <ul className="space-y-2">
                {ctx.weeklyTargets.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2">
                    <span className="truncate text-body-sm text-text">{t.title}</span>
                    <span className="shrink-0 tabular-nums text-caption text-text-muted">{t.progress}%</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Carry-forward candidates</CardTitle>
            <Badge tone={ctx.carryForwardTasks.length ? 'warning' : 'neutral'}>{ctx.carryForwardTasks.length}</Badge>
          </CardHeader>
          <CardContent>
            {ctx.carryForwardTasks.length === 0 ? (
              <EmptyState icon={ClipboardCheck} title="Nothing carrying over" description="All your tasks are wrapped up. Nice." />
            ) : (
              <ul className="space-y-2">
                {ctx.carryForwardTasks.slice(0, 8).map((t) => (
                  <li key={t.id}>
                    <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 transition-colors hover:border-accent/40">
                      <span className="truncate text-body-sm text-text">{t.title}</span>
                      {t.isOverdue && <Badge tone="danger">Overdue</Badge>}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Your review</CardTitle></CardHeader>
        <CardContent>
          <WeeklyReviewForm existing={ctx.review} suggestedCompletion={ctx.targetCompletion} carryForwardSeed={carrySeed} />
        </CardContent>
      </Card>

      {others.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-overline uppercase text-text-secondary">Team reviews this week</h2>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {others.map((r) => (
              <Card key={r.id}>
                <CardHeader>
                  <CardTitle className="text-h3">{r.userName ?? 'Teammate'}</CardTitle>
                  <Badge tone={r.completionPct >= 100 ? 'success' : 'accent'}>{r.completionPct}%</Badge>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {r.summary && <div><p className="text-overline uppercase text-text-muted">Summary</p><p className="whitespace-pre-wrap text-body-sm text-text-secondary">{r.summary}</p></div>}
                  {r.carryForward && <div><p className="text-overline uppercase text-text-muted">Carry forward</p><p className="whitespace-pre-wrap text-body-sm text-text-secondary">{r.carryForward}</p></div>}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
