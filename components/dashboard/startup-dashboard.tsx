import Link from 'next/link';
import {
  CalendarDays, CheckCircle2, Clock, ListTodo, Target, Activity,
  TrendingUp, Gauge, CalendarClock, AlarmClock, CheckSquare, Sunrise, Sun, Moon,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { DashboardHeader } from '@/components/dashboard/header';
import { MEETING_TYPE_META } from '@/lib/meetings/constants';
import type { StartupDashboard } from '@/lib/server/data/dashboard';

function greeting(): { label: string; Icon: typeof Sunrise; color: string } {
  const h = new Date().getHours();
  if (h < 12) return { label: 'Good morning', Icon: Sunrise, color: 'text-warning' };
  if (h < 17) return { label: 'Good afternoon', Icon: Sun, color: 'text-accent-cyan' };
  return { label: 'Good evening', Icon: Moon, color: 'text-accent' };
}

export function StartupDashboard({ firstName, data: d }: { firstName: string; data: StartupDashboard }) {
  const today: Kpi[] = [
    { label: 'Due today', value: String(d.dueToday), icon: ListTodo },
    { label: 'Meetings today', value: String(d.meetingsToday), icon: CalendarDays, tone: 'var(--accent-cyan)' },
    { label: 'Completed today', value: String(d.completedToday), icon: CheckCircle2, tone: 'var(--success)' },
    { label: 'Overdue', value: String(d.overdue), icon: Clock, tone: 'var(--danger)' },
  ];
  const week: Kpi[] = [
    { label: 'Weekly goals', value: `${d.weeklyGoalProgress}%`, icon: Target },
    { label: 'Team activity', value: String(d.teamActivity7d), icon: Activity, tone: 'var(--accent-cyan)' },
    { label: 'Tasks completed', value: String(d.completedThisWeek), icon: CheckCircle2, tone: 'var(--success)' },
    { label: 'Tasks remaining', value: String(d.tasksRemaining), icon: ListTodo },
  ];
  const month: Kpi[] = [
    { label: 'Monthly goals', value: `${d.monthlyGoalProgress}%`, icon: Target },
    { label: 'Completion rate', value: `${d.monthlyCompletionRate}%`, icon: TrendingUp, tone: 'var(--success)' },
    { label: 'Team performance', value: `${d.teamPerformance}%`, icon: Gauge, tone: 'var(--accent-cyan)' },
  ];

  const g = greeting();
  return (
    <div className="mx-auto max-w-[1320px] space-y-6 fade-up">
      <DashboardHeader
        title={`${g.label}, ${firstName}`}
        icon={<g.Icon className={`h-6 w-6 ${g.color}`} />}
        subtitle="Here's where the team stands"
        badge={d.overdue ? { tone: 'warning', label: `${d.overdue} overdue` } : { tone: 'success', label: 'On track' }}
        action={<Link href="/tasks" className={buttonVariants({ variant: 'primary', size: 'md' })}><CheckSquare className="h-4 w-4" /> My tasks</Link>}
      />

      <MorningBand d={d} />

      <Section title="Today">
        <KpiGrid kpis={today} />
      </Section>

      <Section title="This Week">
        <KpiGrid kpis={week} />
      </Section>

      <Section title="This Month">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {month.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </div>
      </Section>

      <Section title="Upcoming">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming meetings</CardTitle>
              <Link href="/meetings" className="text-caption text-accent hover:underline">All meetings</Link>
            </CardHeader>
            <CardContent>
              {d.upcomingMeetings.length === 0 ? (
                <EmptyState icon={CalendarClock} title="Nothing scheduled" description="Create a meeting to see it here." />
              ) : (
                <ul className="space-y-2">
                  {d.upcomingMeetings.map((m) => (
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
              <CardTitle>Upcoming deadlines</CardTitle>
              <Link href="/tasks" className="text-caption text-accent hover:underline">All tasks</Link>
            </CardHeader>
            <CardContent>
              {d.upcomingDeadlines.length === 0 ? (
                <EmptyState icon={AlarmClock} title="No upcoming deadlines" description="Tasks with due dates will appear here." />
              ) : (
                <ul className="space-y-2">
                  {d.upcomingDeadlines.map((t) => (
                    <li key={t.id}>
                      <Link href={`/tasks/${t.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 transition-colors hover:border-accent/40">
                        <p className="truncate text-body-sm text-text">{t.title}</p>
                        <span className="shrink-0 text-caption text-text-muted">{t.due}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Section>
    </div>
  );
}

function MorningBand({ d }: { d: StartupDashboard }) {
  return (
    <Section title="Start of day">
      {/* Daily check-in status strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Sunrise className={d.checkedIn ? 'h-5 w-5 text-success' : 'h-5 w-5 text-info'} />
            <div>
              <p className="text-body-sm font-medium text-text">Daily check-in</p>
              <p className="text-caption text-text-muted">{d.checkedIn ? "You've set your focus for today" : 'Not done yet'}</p>
            </div>
          </div>
          {d.checkedIn ? <Badge tone="success" dot>Done</Badge> : (
            <Link href="/check-in" className={buttonVariants({ variant: 'secondary', size: 'sm' })}>Check in</Link>
          )}
        </div>
        <div className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-4 py-3">
          <div className="flex items-center gap-2.5">
            <Moon className={d.eodDone ? 'h-5 w-5 text-success' : 'h-5 w-5 text-text-muted'} />
            <div>
              <p className="text-body-sm font-medium text-text">End-of-day update</p>
              <p className="text-caption text-text-muted">{d.eodDone ? 'Logged for today' : 'Wrap up at the end of your day'}</p>
            </div>
          </div>
          {d.eodDone ? <Badge tone="success" dot>Done</Badge> : (
            <Link href="/end-of-day" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>Log EOD</Link>
          )}
        </div>
      </div>

      {/* Weekly progress bar */}
      <div className="mt-3 rounded-sm border border-border bg-card px-4 py-3">
        <div className="mb-1.5 flex items-center justify-between text-body-sm">
          <span className="text-text">Weekly goal progress</span>
          <span className="tabular-nums text-text-muted">{d.weeklyGoalProgress}%</span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={d.weeklyGoalProgress} aria-valuemin={0} aria-valuemax={100} aria-label="Weekly goal progress">
          <div className="h-full rounded-full bg-accent transition-[width] duration-base" style={{ width: `${d.weeklyGoalProgress}%` }} />
        </div>
      </div>

      {/* Today's tasks + meetings */}
      <div className="mt-3 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s tasks</CardTitle>
            <Badge tone={d.todaysTasks.length ? 'accent' : 'neutral'}>{d.todaysTasks.length}</Badge>
          </CardHeader>
          <CardContent>
            {d.todaysTasks.length === 0 ? (
              <EmptyState icon={ListTodo} title="Nothing due today" description="Tasks of yours due today appear here." />
            ) : (
              <ul className="space-y-2">
                {d.todaysTasks.map((t) => (
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

        <Card>
          <CardHeader>
            <CardTitle>Today&apos;s meetings</CardTitle>
            <Badge tone={d.todaysMeetings.length ? 'accent' : 'neutral'}>{d.todaysMeetings.length}</Badge>
          </CardHeader>
          <CardContent>
            {d.todaysMeetings.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No meetings today" description="A clear calendar — enjoy the focus." />
            ) : (
              <ul className="space-y-2">
                {d.todaysMeetings.map((m) => (
                  <li key={m.id}>
                    <Link href={`/meetings/${m.id}`} className="flex items-center justify-between gap-3 rounded-sm border border-border bg-card px-3 py-2 transition-colors hover:border-accent/40">
                      <div className="min-w-0">
                        <p className="truncate text-body-sm text-text">{m.title}</p>
                        <p className="text-caption text-text-muted">{new Date(m.scheduledAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })} · {m.durationMin} min</p>
                      </div>
                      <Badge tone={MEETING_TYPE_META[m.type].tone}>{MEETING_TYPE_META[m.type].label}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </Section>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-overline uppercase text-text-secondary">{title}</h2>
      {children}
    </section>
  );
}

function KpiGrid({ kpis }: { kpis: Kpi[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
    </div>
  );
}
