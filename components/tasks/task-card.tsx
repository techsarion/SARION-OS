import Link from 'next/link';
import { CalendarClock, MessageSquare, GitBranch, AlertTriangle } from 'lucide-react';
import { Avatar } from '@/components/ui/misc';
import { StatusBadge, PriorityBadge } from '@/components/tasks/badges';
import type { TaskListItem } from '@/lib/server/data/tasks';

/** Compact task card used by the board and (denser) list. Client-safe (no hooks). */
export function TaskCard({ task, showStatus = false }: { task: TaskListItem; showStatus?: boolean }) {
  return (
    <Link
      href={`/tasks/${task.id}`}
      className="block rounded-sm border border-border bg-card p-3 transition-colors hover:border-accent/40 hover:bg-white/[0.02]"
    >
      <div className="mb-2 flex items-center gap-1.5">
        <PriorityBadge priority={task.priority} />
        {showStatus && <StatusBadge status={task.status} />}
        {task.isOverdue && (
          <span className="inline-flex items-center gap-1 text-caption text-danger"><AlertTriangle className="h-3 w-3" /> Overdue</span>
        )}
      </div>
      <p className="line-clamp-2 text-body-sm font-medium text-text">{task.title}</p>
      {task.tags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1">
          {task.tags.slice(0, 3).map((t) => (
            <span key={t} className="rounded-sm bg-white/[0.05] px-1.5 py-0.5 text-[11px] text-text-muted">{t}</span>
          ))}
        </div>
      )}
      <div className="mt-2.5 flex items-center justify-between text-caption text-text-muted">
        <div className="flex items-center gap-3">
          {task.due_date && (
            <span className={`inline-flex items-center gap-1 ${task.isOverdue ? 'text-danger' : ''}`}>
              <CalendarClock className="h-3.5 w-3.5" /> {task.due_date}
            </span>
          )}
          {task.commentCount > 0 && <span className="inline-flex items-center gap-1"><MessageSquare className="h-3.5 w-3.5" /> {task.commentCount}</span>}
          {task.subtaskCount > 0 && <span className="inline-flex items-center gap-1"><GitBranch className="h-3.5 w-3.5" /> {task.subtaskCount}</span>}
        </div>
        {task.assigneeName ? <Avatar name={task.assigneeName} size={22} /> : <span className="text-[11px]">Unassigned</span>}
      </div>
    </Link>
  );
}
