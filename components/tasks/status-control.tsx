'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { transitionStatus } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/tasks/badges';
import { ALLOWED_TRANSITIONS, STATUS_META } from '@/lib/tasks/constants';
import type { TaskStatus as TaskStatusT } from '@/types/enums';

export function StatusControl({ taskId, status, canChange }: { taskId: string; status: TaskStatusT; canChange: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const next = ALLOWED_TRANSITIONS[status] ?? [];

  const move = (to: TaskStatusT) =>
    start(async () => {
      const res = await transitionStatus(taskId, to);
      if (res.ok) { toast.success(`Moved to ${STATUS_META[to].label}`); router.refresh(); }
      else toast.error(res.error);
    });

  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="text-caption text-text-muted">Status</span>
        <StatusBadge status={status} />
      </div>
      {canChange && next.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {next.map((to) => (
            <Button key={to} size="sm" variant={to === 'COMPLETED' ? 'primary' : 'secondary'} disabled={pending} onClick={() => move(to)}>
              {STATUS_META[to].label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
