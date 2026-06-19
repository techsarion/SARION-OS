'use client';

import { STATUS_ORDER, STATUS_META } from '@/lib/tasks/constants';
import { TaskCard } from '@/components/tasks/task-card';
import type { TaskListItem } from '@/lib/server/data/tasks';

/** Kanban board — one column per status. */
export function TaskBoard({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <div className="grid grid-flow-col gap-3 overflow-x-auto pb-2" style={{ gridAutoColumns: 'minmax(200px, 1fr)' }}>
      {STATUS_ORDER.map((status) => {
        const col = tasks.filter((t) => t.status === status);
        return (
          <div key={status} className="rounded-sm border border-border bg-surface-2/40">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-body-sm font-medium text-text">{STATUS_META[status].label}</span>
              <span className="rounded-sm bg-white/[0.06] px-1.5 text-[11px] tabular-nums text-text-secondary">{col.length}</span>
            </div>
            <div className="space-y-2 p-2">
              {col.length === 0 ? (
                <p className="px-1 py-6 text-center text-caption text-text-muted">No tasks</p>
              ) : (
                col.map((t) => <TaskCard key={t.id} task={t} />)
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
