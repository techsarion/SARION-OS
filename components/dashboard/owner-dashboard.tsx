import Link from 'next/link';
import { Activity, AlertTriangle, CheckSquare, Clock, Gauge, Inbox, ListChecks, TrendingUp, UserRoundPlus, Users, Building2, CalendarPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { DepartmentChart, HealthGauge, ProductivityChart } from '@/components/dashboard/charts';
import { DashboardHeader } from '@/components/dashboard/header';
import { TaskCard } from '@/components/tasks/task-card';
import type { DashboardMetrics } from '@/lib/server/data/dashboard';

const QUICK_ACTIONS = [
  { label: 'New Task', icon: CheckSquare, href: '/tasks/new' },
  { label: 'Create Account', icon: UserRoundPlus, href: '/employees/new' },
  { label: 'New Department', icon: Building2, href: '/departments/new' },
  { label: 'New Team', icon: Users, href: '/teams/new' },
  { label: 'Invite Member', icon: UserRoundPlus, href: '/employees/invite' },
  { label: 'All Tasks', icon: ListChecks, href: '/tasks' },
];

export function OwnerDashboard({ firstName, metrics: m }: { firstName: string; metrics: DashboardMetrics }) {
  const healthTone = m.healthScore >= 80 ? 'success' : m.healthScore >= 60 ? 'warning' : 'danger';
  const kpis: Kpi[] = [
    { label: 'Company Health', value: String(m.healthScore), icon: Gauge },
    { label: 'Open Tasks', value: String(m.openTasks), icon: ListChecks, tone: '#1fc8e6' },
    { label: 'Overdue', value: String(m.overdueTasks), icon: Clock, tone: '#e5484d' },
    { label: 'People', value: String(m.peopleCount), icon: Users, tone: '#34b87a' },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 fade-up">
      <DashboardHeader
        title={`Good morning, ${firstName}`}
        subtitle="Company execution at a glance"
        badge={{ tone: healthTone, label: `Health ${m.healthScore}%` }}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[300px_1fr]">
        <Card className="flex flex-col items-center justify-center py-5">
          <CardTitle className="self-start px-4 text-overline uppercase text-text-muted">Company Health Score</CardTitle>
          <div className="my-3"><HealthGauge value={m.healthScore} /></div>
          <div className="flex items-center gap-1.5 text-caption text-text-muted">
            <TrendingUp className="h-3.5 w-3.5" /> {m.completedTasks} completed · {m.totalTasks} total
          </div>
        </Card>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div><CardTitle>Productivity</CardTitle><p className="mt-0.5 text-caption text-text-muted">Tasks completed · last 7 days</p></div>
          </CardHeader>
          <CardContent className="pt-2"><ProductivityChart data={m.completedLast7Days} /></CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div><CardTitle>Department Load</CardTitle><p className="mt-0.5 text-caption text-text-muted">Open tasks by department</p></div>
            <Users className="h-4 w-4 text-text-muted" />
          </CardHeader>
          <CardContent className="pt-2">
            {m.departmentLoad.length === 0 ? (
              <EmptyState icon={Building2} title="No open tasks" description="Department load appears once work is in progress." />
            ) : (
              <DepartmentChart data={m.departmentLoad} />
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>In Review</CardTitle>
            <Badge tone="warning">{m.reviewTasks.length}</Badge>
          </CardHeader>
          <CardContent>
            {m.reviewTasks.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing in review" description="Tasks awaiting review/approval will show here." />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{m.reviewTasks.slice(0, 6).map((t) => <TaskCard key={t.id} task={t} />)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Attention</CardTitle><AlertTriangle className="h-4 w-4 text-warning" /></CardHeader>
          <CardContent className="space-y-2">
            <Stat label="Overdue tasks" value={m.overdueTasks} tone={m.overdueTasks ? 'danger' : 'neutral'} href="/tasks" />
            <Stat label="Unassigned tasks" value={m.unassignedCount} tone={m.unassignedCount ? 'warning' : 'neutral'} href="/tasks" />
            <Stat label="In progress" value={m.statusCounts.IN_PROGRESS} tone="accent" href="/tasks" />
            <Stat label="Departments" value={m.departmentCount} tone="neutral" href="/departments" />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle><Activity className="h-4 w-4 text-text-muted" /></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            {QUICK_ACTIONS.map((q) => (
              <Link key={q.label} href={q.href} className="flex flex-col items-center gap-2 rounded-sm border border-border bg-surface-2 px-3 py-4 text-center text-body-sm text-text-secondary transition-colors duration-fast hover:border-accent/40 hover:bg-accent-soft hover:text-text">
                <q.icon className="h-5 w-5 text-accent" />
                {q.label}
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Stat({ label, value, tone, href }: { label: string; value: number; tone: 'danger' | 'warning' | 'accent' | 'neutral'; href: string }) {
  return (
    <Link href={href} className="flex items-center justify-between rounded-sm border border-border bg-surface-2 px-3 py-2 transition-colors hover:border-accent/40">
      <span className="text-body-sm text-text-secondary">{label}</span>
      <Badge tone={tone}>{value}</Badge>
    </Link>
  );
}
