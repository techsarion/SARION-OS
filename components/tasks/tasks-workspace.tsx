'use client';

import { useMemo, useState } from 'react';
import { LayoutList, KanbanSquare, CalendarDays, CheckSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/states';
import { TaskListView } from '@/components/tasks/task-list-view';
import { TaskBoard } from '@/components/tasks/task-board';
import { TaskCalendar } from '@/components/tasks/task-calendar';
import type { TaskListItem } from '@/lib/server/data/tasks';

type Scope = 'mine' | 'all';
type View = 'list' | 'board' | 'calendar';

const SCOPES: { key: Scope; label: string }[] = [
  { key: 'mine', label: 'My Tasks' },
  { key: 'all', label: 'All Tasks' },
];
const VIEWS: { key: View; label: string; icon: typeof LayoutList }[] = [
  { key: 'list', label: 'List', icon: LayoutList },
  { key: 'board', label: 'Board', icon: KanbanSquare },
  { key: 'calendar', label: 'Calendar', icon: CalendarDays },
];

export function TasksWorkspace({
  tasks,
  currentUserId,
}: {
  tasks: TaskListItem[];
  currentUserId: string;
}) {
  const [scope, setScope] = useState<Scope>('mine');
  const [view, setView] = useState<View>('list');

  const filtered = useMemo(() => {
    if (scope === 'mine') return tasks.filter((t) => t.assigneeId === currentUserId || t.ownerId === currentUserId);
    return tasks;
  }, [tasks, scope, currentUserId]);

  const scopeCount = (s: Scope) =>
    s === 'mine' ? tasks.filter((t) => t.assigneeId === currentUserId || t.ownerId === currentUserId).length : tasks.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Scope tabs */}
        <div className="flex items-center gap-1 rounded-sm border border-border bg-surface-2 p-0.5">
          {SCOPES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScope(s.key)}
              className={cn(
                'rounded-sm px-3 py-1.5 text-body-sm transition-colors',
                scope === s.key ? 'bg-accent-soft text-text' : 'text-text-secondary hover:text-text',
              )}
            >
              {s.label}
              <span className="ml-1.5 text-caption text-text-muted">{scopeCount(s.key)}</span>
            </button>
          ))}
        </div>
        {/* View switcher */}
        <div className="flex items-center gap-1 rounded-sm border border-border bg-surface-2 p-0.5">
          {VIEWS.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              aria-label={v.label}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-sm px-2.5 py-1.5 text-body-sm transition-colors',
                view === v.key ? 'bg-accent-soft text-text' : 'text-text-secondary hover:text-text',
              )}
            >
              <v.icon className="h-4 w-4" /> <span className="hidden sm:inline">{v.label}</span>
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks here"
          description={scope === 'mine' ? "You have no tasks assigned or owned. Tasks assigned to you will appear here." : 'No tasks match this view yet.'}
        />
      ) : view === 'list' ? (
        <TaskListView tasks={filtered} />
      ) : view === 'board' ? (
        <TaskBoard tasks={filtered} />
      ) : (
        <TaskCalendar tasks={filtered} />
      )}
    </div>
  );
}
