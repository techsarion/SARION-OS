import Link from 'next/link';
import {
  Users, UserCheck, CalendarClock, AlertTriangle, MonitorPlay, Trophy, XCircle, CalendarDays, Sparkles,
} from 'lucide-react';
import { KpiCard, type Kpi } from '@/components/dashboard/kpi-card';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { STATUS_META, FOLLOWUP_META } from '@/lib/leads/constants';
import { timeAgo, verbLabel } from '@/lib/leads/format';
import type { LeadDashboard as Data } from '@/lib/server/data/leads';

export function LeadDashboard({ data }: { data: Data }) {
  const kpis: Kpi[] = [
    { label: 'Total Leads', value: String(data.total), icon: Users },
    { label: 'New This Week', value: String(data.newThisWeek), icon: Sparkles },
    { label: 'Assigned', value: String(data.assignedCount), icon: UserCheck },
    { label: "Today's Follow-ups", value: String(data.followupsToday), icon: CalendarClock },
    { label: 'Overdue Follow-ups', value: String(data.followupsOverdue), icon: AlertTriangle, tone: 'var(--danger)' },
    { label: 'Demo Pipeline', value: String(data.demoPipeline), icon: MonitorPlay },
    { label: 'Won This Month', value: String(data.wonThisMonth), icon: Trophy },
    { label: 'Lost This Month', value: String(data.lostThisMonth), icon: XCircle },
  ];

  const maxStage = Math.max(1, ...data.byStatus.map((s) => s.count));
  const maxCountry = Math.max(1, ...data.byCountry.map((c) => c.count));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {kpis.map((k) => <KpiCard key={k.label} kpi={k} />)}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Pipeline by stage */}
        <Card>
          <CardHeader><CardTitle>Leads by Stage</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.byStatus.length === 0 ? <EmptyState title="No leads yet" /> : data.byStatus.map((s) => (
              <div key={s.status} className="flex items-center gap-2">
                <span className="w-36 shrink-0 truncate text-caption text-text-secondary">{STATUS_META[s.status].label}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-sm bg-white/[0.04]">
                  <div className="h-full rounded-sm bg-accent/70" style={{ width: `${(s.count / maxStage) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-caption tabular-nums text-text">{s.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* By country */}
        <Card>
          <CardHeader><CardTitle>Leads by Country</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.byCountry.length === 0 ? <EmptyState title="No country data" /> : data.byCountry.map((c) => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="w-36 shrink-0 truncate text-caption text-text-secondary">{c.country}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-sm bg-white/[0.04]">
                  <div className="h-full rounded-sm bg-info/70" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-caption tabular-nums text-text">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Today's / overdue follow-ups */}
        <Card>
          <CardHeader>
            <CardTitle>Follow-ups Due</CardTitle>
            <Badge tone={data.followupsOverdue > 0 ? 'danger' : 'neutral'}>{data.followupsOverdue} overdue</Badge>
          </CardHeader>
          <CardContent>
            {data.todayFollowupList.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing due" description="No follow-ups are due today." />
            ) : (
              <ul className="space-y-1.5">
                {data.todayFollowupList.map((f) => (
                  <li key={f.id}>
                    <Link href={`/leads/${f.leadId}`} className="flex items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-white/[0.03]">
                      <Badge tone={f.overdue ? 'danger' : 'info'}>{FOLLOWUP_META[f.type].label}</Badge>
                      <span className="min-w-0 flex-1 truncate text-body-sm text-text">{f.agency}</span>
                      <span className={`text-caption ${f.overdue ? 'text-danger' : 'text-text-muted'}`}>{f.due_date}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Recent activity */}
        <Card>
          <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
          <CardContent>
            {data.recent.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              <ul className="space-y-2">
                {data.recent.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-2 text-body-sm">
                    <span className="min-w-0">
                      <span className="text-text">{verbLabel(a.verb, undefined)}</span>
                      {a.agency && <span className="text-text-muted"> · {a.agency}</span>}
                    </span>
                    <span className="shrink-0 text-caption text-text-muted">{timeAgo(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
