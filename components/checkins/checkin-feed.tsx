import { AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { CheckIn } from '@/lib/server/data/checkins';

const MORNING_ROWS: { key: keyof CheckIn; label: string }[] = [
  { key: 'focus', label: 'Focus' },
  { key: 'priorities', label: 'Priorities' },
  { key: 'progress', label: 'Progress' },
  { key: 'blockers', label: 'Blockers' },
];
const EOD_ROWS: { key: keyof CheckIn; label: string }[] = [
  { key: 'completed', label: 'Completed' },
  { key: 'unfinished', label: 'Unfinished' },
  { key: 'blockers', label: 'Blockers' },
  { key: 'notes', label: 'Notes' },
];

export function CheckInFeed({ checkIns, kind }: { checkIns: CheckIn[]; kind: 'MORNING' | 'EOD' }) {
  const rows = kind === 'MORNING' ? MORNING_ROWS : EOD_ROWS;
  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      {checkIns.map((c) => (
        <Card key={c.id}>
          <CardHeader>
            <CardTitle className="text-h3">{c.userName ?? 'Teammate'}</CardTitle>
            {c.blockers && c.blockers.trim() ? <Badge tone="warning" dot>Has blockers</Badge> : <Badge tone="success" dot>Clear</Badge>}
          </CardHeader>
          <CardContent className="space-y-2.5">
            {rows.map(({ key, label }) => {
              const val = c[key] as string | null;
              if (!val || !val.trim()) return null;
              const isBlocker = key === 'blockers';
              return (
                <div key={key as string}>
                  <p className="flex items-center gap-1.5 text-overline uppercase text-text-muted">
                    {isBlocker && <AlertTriangle className="h-3 w-3 text-warning" />} {label}
                  </p>
                  <p className="whitespace-pre-wrap text-body-sm text-text-secondary">{val}</p>
                </div>
              );
            })}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
