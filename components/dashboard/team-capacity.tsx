import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/states';
import { cn } from '@/lib/utils';
import type { CapacityRow } from '@/lib/server/data/capacity';

/** Team Capacity widget — open / overdue tasks and weekly progress per person. */
export function TeamCapacity({ rows }: { rows: CapacityRow[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Team capacity</CardTitle>
        <Badge tone="neutral">{rows.length} people</Badge>
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <EmptyState icon={Users} title="No team members" description="People show up here once they're added." />
        ) : (
          <>
          {/* Mobile (<sm): stacked cards. */}
          <ul className="space-y-2 sm:hidden">
            {rows.map((r) => (
              <li key={r.id} className="rounded-sm border border-border bg-card p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="min-w-0 flex-1 truncate text-body-sm font-medium text-text">{r.name}</span>
                  <span className="shrink-0 text-caption text-text-muted">
                    {r.openTasks} open{r.overdueTasks > 0 && <span className="text-danger"> · {r.overdueTasks} overdue</span>}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={r.weeklyProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} weekly progress`}>
                    <div className="h-full rounded-full bg-accent" style={{ width: `${r.weeklyProgress}%` }} />
                  </div>
                  <span className="shrink-0 tabular-nums text-caption text-text-muted">{r.weeklyProgress}%</span>
                </div>
              </li>
            ))}
          </ul>
          {/* Tablet/desktop (sm+): table. */}
          <div className="hidden overflow-x-auto sm:block">
            <table className="w-full text-body-sm">
              <thead>
                <tr className="text-left text-overline uppercase text-text-muted">
                  <th className="pb-2 pr-3 font-medium">Member</th>
                  <th className="pb-2 px-3 text-right font-medium">Open</th>
                  <th className="pb-2 px-3 text-right font-medium">Overdue</th>
                  <th className="pb-2 pl-3 font-medium">Weekly progress</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3 text-text">{r.name}</td>
                    <td className="py-2.5 px-3 text-right tabular-nums text-text-secondary">{r.openTasks}</td>
                    <td className={cn('py-2.5 px-3 text-right tabular-nums', r.overdueTasks > 0 ? 'text-danger' : 'text-text-muted')}>{r.overdueTasks}</td>
                    <td className="py-2.5 pl-3">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-full max-w-[140px] overflow-hidden rounded-full bg-white/[0.06]" role="progressbar" aria-valuenow={r.weeklyProgress} aria-valuemin={0} aria-valuemax={100} aria-label={`${r.name} weekly progress`}>
                          <div className="h-full rounded-full bg-accent" style={{ width: `${r.weeklyProgress}%` }} />
                        </div>
                        <span className="shrink-0 tabular-nums text-caption text-text-muted">{r.weeklyProgress}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
