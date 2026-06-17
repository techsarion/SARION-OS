'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { assignTask } from '@/lib/actions/tasks';
import { Select } from '@/components/ui/select';

export function AssigneeControl({
  taskId,
  assigneeId,
  people,
}: {
  taskId: string;
  assigneeId: string | null;
  people: { id: string; full_name: string }[];
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="space-y-1.5">
      <span className="text-caption text-text-muted">Assignee</span>
      <Select
        defaultValue={assigneeId ?? ''}
        disabled={pending}
        onChange={(e) => {
          const value = e.target.value || null;
          start(async () => {
            const res = await assignTask(taskId, value);
            if (res.ok) { toast.success(value ? 'Assignment updated' : 'Unassigned'); router.refresh(); }
            else toast.error(res.error);
          });
        }}
      >
        <option value="">— Unassigned —</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>
    </div>
  );
}
