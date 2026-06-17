import Link from 'next/link';
import { CheckSquare, Clock, Inbox, ListChecks, Plus, BadgeCheck } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { ProductivityChart } from '@/components/dashboard/charts';
import { DashboardHeader } from '@/components/dashboard/header';
import { TaskCard } from '@/components/tasks/task-card';
import type { DashboardMetrics } from '@/lib/server/data/dashboard';

export function DepartmentDashboard({ firstName, metrics: m }: { firstName: string; metrics: DashboardMetrics }) {
  const kpis: Kpi[] = [
    { label: 'Open Tasks', value: String(m.openTasks), icon: ListChecks },
    { label: 'Overdue', value: String(m.overdueTasks), icon: Clock, tone: '#e5484d' },
    { label: 'In Review', value: String(m.inReview), icon: BadgeCheck, tone: '#e0a93b' },
    { label: 'Completed', value: String(m.completedTasks), icon: CheckSquare, tone: '#34b87a' },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 fade-up">
      <DashboardHeader
        title={`Good morning, ${firstName}`}
        subtitle="Your department at a glance"
        badge={{ tone: m.overdueTasks ? 'warning' : 'success', label: m.overdueTasks ? `${m.overdueTasks} overdue` : 'On track' }}
        action={<Link href="/tasks/new" className={buttonVariants({ variant: 'primary', size: 'md' })}><Plus className="h-4 w-4" /> Assign task</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Card>
          <CardHeader><div><CardTitle>Throughput</CardTitle><p className="mt-0.5 text-caption text-text-muted">Completed · last 7 days</p></div></CardHeader>
          <CardContent className="pt-2"><ProductivityChart data={m.completedLast7Days} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Unassigned</CardTitle><Badge tone={m.unassignedCount ? 'warning' : 'neutral'}>{m.unassignedCount}</Badge></CardHeader>
          <CardContent>
            {m.unassignedCount === 0 ? (
              <EmptyState icon={CheckSquare} title="Everything's assigned" description="No open tasks are waiting for an owner." />
            ) : (
              <p className="text-body-sm text-text-secondary">{m.unassignedCount} open task{m.unassignedCount > 1 ? 's' : ''} need an assignee. <Link href="/tasks" className="text-accent hover:underline">Review</Link></p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>In Review</CardTitle><Badge tone="warning">{m.reviewTasks.length}</Badge></CardHeader>
        <CardContent>
          {m.reviewTasks.length === 0 ? (
            <EmptyState icon={Inbox} title="Nothing in review" description="Tasks moved to review will appear here for approval." />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">{m.reviewTasks.slice(0, 6).map((t) => <TaskCard key={t.id} task={t} showStatus />)}</div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
