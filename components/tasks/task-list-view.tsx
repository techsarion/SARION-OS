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
      <div className="overflow-x-auto">
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
