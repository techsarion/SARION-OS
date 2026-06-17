import { BadgeCheck, CheckCircle2, Gauge, Inbox, ListChecks, Users, Building2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { DepartmentChart, ProductivityChart } from '@/components/dashboard/charts';
import { DashboardHeader } from '@/components/dashboard/header';
import { TaskCard } from '@/components/tasks/task-card';
import { STATUS_ORDER, STATUS_META } from '@/lib/tasks/constants';
import type { DashboardMetrics } from '@/lib/server/data/dashboard';

export function ManagingDirectorDashboard({ firstName, metrics: m }: { firstName: string; metrics: DashboardMetrics }) {
  const kpis: Kpi[] = [
    { label: 'Org Health', value: `${m.healthScore}%`, icon: Gauge },
    { label: 'Completed', value: String(m.completedTasks), icon: CheckCircle2, tone: '#34b87a' },
    { label: 'In Review', value: String(m.inReview), icon: BadgeCheck, tone: '#e0a93b' },
    { label: 'Open Tasks', value: String(m.openTasks), icon: ListChecks, tone: '#1fc8e6' },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 fade-up">
      <DashboardHeader
        title={`Welcome, ${firstName}`}
        subtitle="Cross-department performance"
        badge={{ tone: m.overdueTasks ? 'warning' : 'success', label: `${m.overdueTasks} overdue` }}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><div><CardTitle>Throughput</CardTitle><p className="mt-0.5 text-caption text-text-muted">Completed · last 7 days</p></div></CardHeader>
          <CardContent className="pt-2"><ProductivityChart data={m.completedLast7Days} /></CardContent>
        </Card>
        <Card>
          <CardHeader><div><CardTitle>Department Load</CardTitle><p className="mt-0.5 text-caption text-text-muted">Open tasks by department</p></div><Users className="h-4 w-4 text-text-muted" /></CardHeader>
          <CardContent className="pt-2">
            {m.departmentLoad.length === 0 ? (
              <EmptyState icon={Building2} title="No open tasks" />
            ) : <DepartmentChart data={m.departmentLoad} />}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1fr_1fr]">
        <Card>
          <CardHeader><CardTitle>Awaiting Review</CardTitle><Badge tone="warning">{m.reviewTasks.length}</Badge></CardHeader>
          <CardContent>
            {m.reviewTasks.length === 0 ? (
              <EmptyState icon={Inbox} title="Nothing awaiting review" />
            ) : (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{m.reviewTasks.slice(0, 6).map((t) => <TaskCard key={t.id} task={t} />)}</div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Work Breakdown</CardTitle></CardHeader>
          <div className="divide-y divide-border">
            {STATUS_ORDER.map((s) => (
              <div key={s} className="flex items-center justify-between px-4 py-2.5">
                <span className="text-body-sm text-text-secondary">{STATUS_META[s].label}</span>
                <Badge tone={STATUS_META[s].tone}>{m.statusCounts[s]}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
