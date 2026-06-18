'use client';

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

const AXIS = { fontSize: 11, fill: 'var(--text-muted)' };

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-sm border border-border-strong bg-card px-2.5 py-1.5 text-caption shadow-e2">
      <div className="mb-0.5 font-medium text-text">{label}</div>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-1.5 text-text-secondary">
          <span className="h-2 w-2 rounded-sm" style={{ background: p.color || p.fill }} />
          <span className="tabular-nums text-text">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

/** Throughput / cycle-time area chart (brand gradient fill, kept subtle). */
export function ProductivityChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="sarionArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity={0.32} />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-strong)' }} />
        <Area
          type="monotone"
          dataKey="value"
          stroke="var(--accent)"
          strokeWidth={2}
          fill="url(#sarionArea)"
          dot={false}
          activeDot={{ r: 3, fill: 'var(--accent)', stroke: 'var(--card)', strokeWidth: 2 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Department performance — horizontal-feel bars colored by score band. */
export function DepartmentChart({
  data,
}: {
  data: { name: string; value: number }[];
}) {
  const color = (v: number) =>
    v >= 85 ? 'var(--success)' : v >= 70 ? 'var(--accent)' : 'var(--warning)';
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 6, left: -18, bottom: 0 }} barCategoryGap="32%">
        <XAxis dataKey="name" tick={AXIS} axisLine={false} tickLine={false} />
        <YAxis tick={AXIS} axisLine={false} tickLine={false} width={36} domain={[0, 100]} />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
        <Bar dataKey="value" radius={[2, 2, 0, 0]} maxBarSize={34}>
          {data.map((d) => (
            <Cell key={d.name} fill={color(d.value)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Radial company-health gauge (SVG arc, brand gradient stroke). */
export function HealthGauge({ value }: { value: number }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const pct = Math.min(100, Math.max(0, value));
  const offset = c - (pct / 100) * c * 0.75; // 270° arc
  return (
    <div className="relative grid place-items-center">
      <svg width="140" height="140" viewBox="0 0 140 140" className="-rotate-[135deg]">
        <defs>
          <linearGradient id="gaugeGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="var(--accent)" />
            <stop offset="100%" stopColor="var(--accent-cyan)" />
          </linearGradient>
        </defs>
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="var(--border)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${c * 0.75} ${c}`}
        />
        <circle
          cx="70"
          cy="70"
          r={r}
          fill="none"
          stroke="url(#gaugeGrad)"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-display leading-none tabular-nums text-text">{pct}</span>
        <span className="text-caption text-text-muted">Health</span>
      </div>
    </div>
  );
}

/** Inline KPI sparkline. */
export function Sparkline({ data, tone = 'var(--accent)' }: { data: number[]; tone?: string }) {
  const points = data.map((v, i) => ({ name: i, value: v }));
  return (
    <ResponsiveContainer width="100%" height={36}>
      <AreaChart data={points} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={`spark-${tone}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={tone} stopOpacity={0.28} />
            <stop offset="100%" stopColor={tone} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={tone}
          strokeWidth={1.5}
          fill={`url(#spark-${tone})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
