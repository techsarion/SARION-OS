'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import type { TaskListItem } from '@/lib/server/data/tasks';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/** Month calendar keyed off task due dates. */
export function TaskCalendar({ tasks }: { tasks: TaskListItem[] }) {
  const [cursor, setCursor] = useState(() => { const d = new Date(); return { y: d.getFullYear(), m: d.getMonth() }; });

  const byDate = useMemo(() => {
    const map = new Map<string, TaskListItem[]>();
    for (const t of tasks) {
      if (!t.due_date) continue;
      if (!map.has(t.due_date)) map.set(t.due_date, []);
      map.get(t.due_date)!.push(t);
    }
    return map;
  }, [tasks]);

  const first = new Date(cursor.y, cursor.m, 1);
  const monthName = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const startOffset = (first.getDay() + 6) % 7; // Mon-first
  const daysInMonth = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const pad = (n: number) => String(n).padStart(2, '0');
  const key = (day: number) => `${cursor.y}-${pad(cursor.m + 1)}-${pad(day)}`;
  const move = (delta: number) => setCursor((c) => { const d = new Date(c.y, c.m + delta, 1); return { y: d.getFullYear(), m: d.getMonth() }; });
  const unscheduled = tasks.filter((t) => !t.due_date).length;

  return (
    <Card className="p-3">
      <div className="mb-3 flex items-center justify-between px-1">
        <h3 className="text-h3">{monthName}</h3>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon-sm" onClick={() => move(-1)} aria-label="Previous month"><ChevronLeft className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon-sm" onClick={() => move(1)} aria-label="Next month"><ChevronRight className="h-4 w-4" /></Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map((d) => <div key={d} className="px-1 py-1 text-center text-overline uppercase text-text-muted">{d}</div>)}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-[84px] rounded-sm border p-1 ${day ? 'border-border bg-surface-2/30' : 'border-transparent'}`}>
            {day && (
              <>
                <div className="mb-1 px-1 text-caption tabular-nums text-text-muted">{day}</div>
                <div className="space-y-1">
                  {(byDate.get(key(day)) ?? []).slice(0, 3).map((t) => (
                    <Link key={t.id} href={`/tasks/${t.id}`} className="block truncate rounded-sm px-1 py-0.5 text-[11px] text-text hover:bg-white/[0.05]"
                      style={{ borderLeft: `2px solid var(--${t.isOverdue ? 'danger' : 'accent'})` }} title={t.title}>
                      <span className="text-text-muted">{t.priority}</span> {t.title}
                    </Link>
                  ))}
                  {(byDate.get(key(day))?.length ?? 0) > 3 && (
                    <span className="px-1 text-[11px] text-text-muted">+{(byDate.get(key(day))!.length - 3)} more</span>
                  )}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
      {unscheduled > 0 && <p className="mt-3 px-1 text-caption text-text-muted">{unscheduled} task{unscheduled > 1 ? 's' : ''} with no due date.</p>}
    </Card>
  );
}
