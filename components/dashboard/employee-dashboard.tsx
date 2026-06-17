import Link from 'next/link';
import { CheckCircle2, CheckSquare, Clock, ListChecks, Target } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/states';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { DashboardHeader } from '@/components/dashboard/header';
import { TaskCard } from '@/components/tasks/task-card';
import type { DashboardMetrics } from '@/lib/server/data/dashboard';

export function EmployeeDashboard({ firstName, metrics: m }: { firstName: string; metrics: DashboardMetrics }) {
  const myOpen = m.myOpen.length;
  const kpis: Kpi[] = [
    { label: 'My open tasks', value: String(myOpen), icon: CheckSquare },
    { label: 'Overdue', value: String(m.myOverdue), icon: Clock, tone: '#e5484d' },
    { label: 'Completed', value: String(m.myCompleted30), icon: CheckCircle2, tone: '#34b87a' },
    { label: 'In review', value: String(m.myOpen.filter((t) => t.status === 'REVIEW').length), icon: Target, tone: '#1fc8e6' },
  ];

  return (
    <div className="mx-auto max-w-[1320px] space-y-5 fade-up">
      <DashboardHeader
        title={`Good morning, ${firstName}`}
        subtitle="Here's what's on your plate"
        badge={m.myOverdue ? { tone: 'warning', label: `${m.myOverdue} overdue` } : { tone: 'success', label: 'On track' }}
        action={<Link href="/tasks" className={buttonVariants({ variant: 'primary', size: 'md' })}><CheckSquare className="h-4 w-4" /> My tasks</Link>}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>My Tasks</CardTitle>
          <Badge tone={myOpen ? 'accent' : 'neutral'}>{myOpen} open</Badge>
        </CardHeader>
        <CardContent>
          {myOpen === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No open tasks"
              description="Tasks assigned to you will appear here. Enjoy the calm."
            />
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {m.myOpen.map((t) => <TaskCard key={t.id} task={t} showStatus />)}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
