import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { Sparkline } from './charts';
import { cn } from '@/lib/utils';

export interface Kpi {
  label: string;
  value: string;
  icon: LucideIcon;
  /** Optional trend chip — only shown when real comparison data exists. */
  delta?: string;
  trend?: 'up' | 'down';
  good?: boolean; // whether the trend direction is positive for the business
  /** Optional sparkline series — only shown when real history exists. */
  spark?: number[];
  tone?: string;
}

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const tone = kpi.tone ?? 'var(--accent)';
  const DeltaIcon = kpi.trend === 'down' ? ArrowDownRight : ArrowUpRight;
  return (
    <div className="group rounded-sm border border-border bg-card p-4 shadow-e1 transition-colors duration-fast hover:border-border-strong">
      <div className="flex items-center justify-between">
        <span className="text-overline uppercase text-text-muted">{kpi.label}</span>
        <kpi.icon className="h-4 w-4 text-text-muted" />
      </div>
      <div className="mt-2.5 flex items-end justify-between gap-2">
        <span className="tnum text-2xl font-semibold leading-none tracking-tight text-text sm:text-[28px]">
          {kpi.value}
        </span>
        {kpi.delta && (
          <span
            className={cn(
              'mb-0.5 inline-flex items-center gap-0.5 text-caption font-medium tabular-nums',
              kpi.good ? 'text-success' : 'text-danger',
            )}
          >
            <DeltaIcon className="h-3 w-3" />
            {kpi.delta}
          </span>
        )}
      </div>
      {kpi.spark && kpi.spark.length > 0 && (
        <div className="mt-2 -mx-1">
          <Sparkline data={kpi.spark} tone={tone} />
        </div>
      )}
    </div>
  );
}
