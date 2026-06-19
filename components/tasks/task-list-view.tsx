'use client';

import Link from 'next/link';
import { AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Avatar } from '@/components/ui/misc';
import { StatusBadge, PriorityBadge } from '@/components/tasks/badges';
import type { TaskListItem } from '@/lib/server/data/tasks';

/** Dense list/table view of tasks. */
export function TaskListView({ tasks }: { tasks: TaskListItem[] }) {
  return (
    <Card className="overflow-hidden">
      {/* Mobile (<sm): card rows instead of a horizontally-scrolling table. */}
      <ul className="divide-y divide-border sm:hidden">
        {tasks.map((t) => (
          <li key={t.id}>
            <Link href={`/tasks/${t.id}`} className="block px-4 py-3 transition-colors hover:bg-white/[0.02]">
              <div className="flex items-start justify-between gap-2">
                <span className="min-w-0 flex-1 font-medium text-text">{t.title}</span>
                {t.due_date && (
                  <span className={t.isOverdue ? 'inline-flex shrink-0 items-center gap-1 text-caption text-danger' : 'shrink-0 text-caption text-text-secondary'}>
                    {t.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />} {t.due_date}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <PriorityBadge priority={t.priority} />
                <StatusBadge status={t.status} />
                {t.assigneeName && <span className="inline-flex items-center gap-1.5 text-caption text-text-secondary"><Avatar name={t.assigneeName} src={t.assigneeAvatar} size={18} /> {t.assigneeName}</span>}
                {t.departmentName && <span className="text-caption text-text-muted">· {t.departmentName}</span>}
              </div>
            </Link>
          </li>
        ))}
      </ul>

      {/* Tablet/desktop (sm+): full table. */}
      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full text-body-sm">
          <thead>
            <tr className="border-b border-border text-left text-caption text-text-muted">
              <th className="px-4 py-2.5 font-medium">Task</th>
              <th className="px-4 py-2.5 font-medium">Priority</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium">Assignee</th>
              <th className="px-4 py-2.5 font-medium">Due</th>
              <th className="px-4 py-2.5 font-medium">Dept</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {tasks.map((t) => (
              <tr key={t.id} className="transition-colors hover:bg-white/[0.02]">
                <td className="px-4 py-2.5">
                  <Link href={`/tasks/${t.id}`} className="font-medium text-text hover:text-accent">{t.title}</Link>
                  {t.subtaskCount > 0 && <span className="ml-2 text-caption text-text-muted">{t.subtaskCount} subtasks</span>}
                </td>
                <td className="px-4 py-2.5"><PriorityBadge priority={t.priority} /></td>
                <td className="px-4 py-2.5"><StatusBadge status={t.status} /></td>
                <td className="px-4 py-2.5">
                  {t.assigneeName ? (
                    <span className="inline-flex items-center gap-2"><Avatar name={t.assigneeName} src={t.assigneeAvatar} size={22} /> <span className="text-text-secondary">{t.assigneeName}</span></span>
                  ) : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-2.5">
                  {t.due_date ? (
                    <span className={t.isOverdue ? 'inline-flex items-center gap-1 text-danger' : 'text-text-secondary'}>
                      {t.isOverdue && <AlertTriangle className="h-3.5 w-3.5" />} {t.due_date}
                    </span>
                  ) : <span className="text-text-muted">—</span>}
                </td>
                <td className="px-4 py-2.5 text-text-secondary">{t.departmentName ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
