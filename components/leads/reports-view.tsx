import { UserPlus, Linkedin, Mail, MessageSquare, MonitorPlay, Trophy, Percent, GitBranch } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import type { LeadReports } from '@/lib/server/data/leads';
import type { LucideIcon } from 'lucide-react';

export function ReportsView({ data }: { data: LeadReports }) {
  const weekly: { label: string; value: number; icon: LucideIcon }[] = [
    { label: 'Leads Added', value: data.weekly.leadsAdded, icon: UserPlus },
    { label: 'Connections Sent', value: data.weekly.connectionsSent, icon: Linkedin },
    { label: 'Emails Sent', value: data.weekly.emailsSent, icon: Mail },
    { label: 'Replies', value: data.weekly.replies, icon: MessageSquare },
    { label: 'Demos', value: data.weekly.demos, icon: MonitorPlay },
    { label: 'Customers', value: data.weekly.customers, icon: Trophy },
  ];
  const maxCountry = Math.max(1, ...data.monthly.topCountries.map((c) => c.count));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader><CardTitle>This Week</CardTitle><span className="text-caption text-text-muted">Last 7 days</span></CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6">
            {weekly.map((w) => (
              <div key={w.label} className="rounded-sm border border-border bg-surface-2/50 p-3">
                <w.icon className="h-4 w-4 text-text-muted" />
                <div className="mt-2 text-2xl font-semibold tabular-nums text-text">{w.value}</div>
                <div className="text-caption text-text-muted">{w.label}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Snapshot</CardTitle><span className="text-caption text-text-muted">Last 30 days</span></CardHeader>
          <CardContent className="grid grid-cols-2 gap-2.5">
            <div className="rounded-sm border border-border bg-surface-2/50 p-3">
              <Percent className="h-4 w-4 text-text-muted" />
              <div className="mt-2 text-2xl font-semibold tabular-nums text-success">{data.monthly.conversionPct}%</div>
              <div className="text-caption text-text-muted">Conversion (Won)</div>
            </div>
            <div className="rounded-sm border border-border bg-surface-2/50 p-3">
              <GitBranch className="h-4 w-4 text-text-muted" />
              <div className="mt-2 text-2xl font-semibold tabular-nums text-text">{data.monthly.pipelineOpen}</div>
              <div className="text-caption text-text-muted">Open Pipeline</div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Top Countries</CardTitle></CardHeader>
          <CardContent className="space-y-1.5">
            {data.monthly.topCountries.length === 0 ? <EmptyState title="No country data" /> : data.monthly.topCountries.map((c) => (
              <div key={c.country} className="flex items-center gap-2">
                <span className="w-32 shrink-0 truncate text-caption text-text-secondary">{c.country}</span>
                <div className="h-4 flex-1 overflow-hidden rounded-sm bg-white/[0.04]">
                  <div className="h-full rounded-sm bg-accent/70" style={{ width: `${(c.count / maxCountry) * 100}%` }} />
                </div>
                <span className="w-8 shrink-0 text-right text-caption tabular-nums text-text">{c.count}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
