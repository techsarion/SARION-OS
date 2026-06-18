import Link from 'next/link';
import { CheckSquare, Target, CalendarDays, Activity as ActivityIcon, Clock, CheckCircle2 } from 'lucide-react';
import { requireUser } from '@/lib/auth';
import { getPersonalDashboard } from '@/lib/server/data/personal';
import { DashboardHeader } from '@/components/dashboard/header';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { TaskCard } from '@/components/tasks/task-card';
import { MEETING_TYPE_META } from '@/lib/meetings/constants';
import type { TargetItem } from '@/lib/server/data/targets';

function ago(iso: string): string {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export default async function PersonalDashboardPage() {
  const user = await requireUser();
  const firstName = user.fullName?.split(' ')[0] ?? 'there';
  const d = await getPersonalDashboard(user.id);
  const allTargets = [...d.targets.daily, ...d.targets.weekly, ...d.targets.monthly];

  const kpis: Kpi[] = [
    { label: 'Open tasks', value: String(d.openTasks.length), icon: CheckSquare },
    { label: 'Overdue', value: String(d.overdueCount), icon: Clock, tone: 'var(--danger)' },
    { label: 'Completed', value: String(d.completedCount), icon: CheckCircle2, tone: 'var(--success)' },
    { label: 'Active targets', value: String(allTargets.filter((t) => t.status !== 'COMPLETED').length), icon: Target, tone: 'var(--accent-cyan)' },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-6 fade-up">
      <DashboardHeader
        title={`Your day, ${firstName}`}
        subtitle="Everything assigned to you"
        badge={d.overdueCount ? { tone: 'warning', label: `${d.overdueCount} overdue` } : { tone: 'success', label: 'On track' }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>My Tasks</CardTitle>
            <Link href="/tasks" className="text-caption text-accent hover:underline">All tasks</Link>
          </CardHeader>
          <CardContent>
            {d.openTasks.length === 0 ? (
              <EmptyState icon={CheckSquare} title="No open tasks" description="Tasks assigned to you appear here." />
            ) : (
              <div className="grid grid-cols-1 gap-2">
                {d.openTasks.slice(0, 6).map((t) => <TaskCard key={t.id} task={t} showStatus />)}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Targets</CardTitle>
            <Link href="/daily-targets" className="text-caption text-accent hover:underline">Manage</Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <TargetGroup label="Daily" items={d.targets.daily} />
            <TargetGroup label="Weekly" items={d.targets.weekly} />
            <TargetGroup label="Monthly" items={d.targets.monthly} />
            {allTargets.length === 0 && <EmptyState icon={Target} title="No targets set" description="Set daily, weekly and monthly targets to track your goals." />}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>My Meetings</CardTitle>
            <Link href="/meetings" className="text-caption text-accent hover:underline">All meetings</Link>
          </CardHeader>
          <CardContent>
            {d.meetings.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No upcoming meetings" description="Meetings you organize or join appear here." />
            ) : (
              <ul className="space-y-2">
                {d.meetings.map((m) => (
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
            <CardTitle>My Activity</CardTitle>
            <Link href="/activity" className="text-caption text-accent hover:underline">Team feed</Link>
          </CardHeader>
          <CardContent>
            {d.activity.length === 0 ? (
              <EmptyState icon={ActivityIcon} title="No recent activity" description="Your recent actions show up here." />
            ) : (
              <ul className="space-y-2.5">
                {d.activity.map((a) => {
                  const inner = <span className="text-body-sm text-text-secondary">You {a.phrase}<span className="ml-1.5 text-caption text-text-muted">· {ago(a.createdAt)}</span></span>;
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

function TargetGroup({ label, items }: { label: string; items: TargetItem[] }) {
  if (items.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="text-overline uppercase text-text-muted">{label}</p>
      {items.map((t) => (
        <div key={t.id} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-1.5">
          <span className="truncate text-body-sm text-text">{t.title}</span>
          <span className="shrink-0 tabular-nums text-caption text-text-muted">{t.progress}%</span>
        </div>
      ))}
    </div>
  );
}
