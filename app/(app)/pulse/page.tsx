import Link from 'next/link';
import { CalendarDays, TrendingUp, Gauge, CheckCircle2, CalendarClock } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getTeamPulse } from '@/lib/server/data/pulse';
import { getTeamCapacity } from '@/lib/server/data/capacity';
import { TeamCapacity } from '@/components/dashboard/team-capacity';
import { DashboardHeader } from '@/components/dashboard/header';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { MEETING_TYPE_META } from '@/lib/meetings/constants';

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function TeamPulsePage() {
  await requireUser();
  const [p, capacity] = await Promise.all([getTeamPulse(), getTeamCapacity()]);

  const kpis: Kpi[] = [
    { label: 'Weekly completion', value: `${p.weeklyCompletion}%`, icon: TrendingUp },
    { label: 'Monthly completion', value: `${p.monthlyCompletion}%`, icon: Gauge, tone: 'var(--accent-cyan)' },
    { label: 'Tasks done (7d)', value: String(p.weeklyCompletedTasks), icon: CheckCircle2, tone: 'var(--success)' },
    { label: 'Upcoming meetings', value: String(p.upcomingMeetings.length), icon: CalendarDays },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 fade-up">
      <DashboardHeader title="Team Pulse" subtitle="How the whole team is tracking" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <TeamCapacity rows={capacity} />

      <Card>
        <CardHeader><CardTitle>Team progress</CardTitle></CardHeader>
        <CardContent>
          {p.teamProgress.length === 0 ? (
            <p className="text-body-sm text-text-muted">No team members to show yet.</p>
          ) : (
          <div className="space-y-3">
            {p.teamProgress.map((m) => (
              <div key={m.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-body-sm">
                  <span className="text-text">{m.name}</span>
                  <span className="text-text-muted">{m.completedTasks} done · {m.openTasks} open · <span className="tabular-nums text-text">{m.completionPct}%</span></span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={m.completionPct} aria-valuemin={0} aria-valuemax={100} aria-label={`${m.name} completion`}>
                  <div className="h-full rounded-full bg-accent transition-[width] duration-base" style={{ width: `${m.completionPct}%` }} />
                </div>
              </div>
            ))}
          </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Upcoming meetings</CardTitle>
            <Link href="/meetings" className="text-caption text-accent hover:underline">All meetings</Link>
          </CardHeader>
          <CardContent>
            {p.upcomingMeetings.length === 0 ? (
              <EmptyState icon={CalendarClock} title="Nothing scheduled" description="Upcoming meetings appear here." />
            ) : (
              <ul className="space-y-2">
                {p.upcomingMeetings.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 transition-colors hover:border-accent/40">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm text-text">{m.title}</p>
                        <p className="text-caption text-text-muted">{new Date(m.scheduledAt).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                      <Badge tone={MEETING_TYPE_META[m.type].tone}>{MEETING_TYPE_META[m.type].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent activity</CardTitle>
            <Link href="/activity" className="text-caption text-accent hover:underline">Full feed</Link>
          </CardHeader>
          <CardContent>
            {p.recentActivity.length === 0 ? (
              <EmptyState title="No activity yet" description="Team actions show up here." />
            ) : (
              <ul className="space-y-2.5">
                {p.recentActivity.map((a) => {
                  const inner = <span className="text-body-sm text-text-secondary"><span className="text-text">{a.actorName}</span> {a.phrase}<span className="ml-1.5 text-caption text-text-muted">· {ago(a.createdAt)}</span></span>;
                  return (
                    <li key={a.id} className="flex items-start gap-2.5">
                      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
                      {a.href ? <Link href={a.href} className="hover:underline">{inner}</Link> : inner}
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
