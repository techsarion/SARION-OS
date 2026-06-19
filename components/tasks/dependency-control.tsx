'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, GitBranch } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import { addDependency, removeDependency } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import { Select } from '@/components/ui/select';
import { StatusBadge } from '@/components/tasks/badges';
import type { TaskLink } from '@/lib/server/data/tasks';

export function DependencyControl({
  taskId,
  dependencies,
  dependents,
  candidates,
  canManage,
}: {
  taskId: string;
  dependencies: TaskLink[];
  dependents: TaskLink[];
  candidates: { id: string; title: string }[];
  canManage: boolean;
}) {
  const [pick, setPick] = useState('');
  const [pending, start] = useTransition();
  const router = useRouter();

  const add = () => {
    if (!pick) return;
    start(async () => {
      const res = await addDependency(taskId, pick);
      if (res.ok) { toast.success('Dependency added'); setPick(''); router.refresh(); }
      else toast.error(res.error);
    });
  };
  const remove = (id: string) =>
    start(async () => {
      const res = await removeDependency(id, taskId);
      if (res.ok) { toast.success('Dependency removed'); router.refresh(); }
      else toast.error(res.error);
    });

  return (
    <div className="space-y-3">
      <div>
        <p className="mb-1.5 text-caption text-text-muted">Blocked by</p>
        {dependencies.length === 0 ? (
          <p className="text-caption text-text-muted">No blockers.</p>
        ) : (
          <ul className="space-y-1">
            {dependencies.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1.5">
                <GitBranch className="h-3.5 w-3.5 text-text-muted" />
                <Link href={`/tasks/${d.taskId}`} className="flex-1 truncate text-body-sm text-text hover:text-accent">{d.title}</Link>
                <StatusBadge status={d.status} />
                {canManage && (
                  <button onClick={() => remove(d.id)} disabled={pending} aria-label="Remove" className="-m-1 shrink-0 p-1 text-text-muted hover:text-danger"><X className="h-3.5 w-3.5" /></button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {canManage && candidates.length > 0 && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={pick} onChange={(e) => setPick(e.target.value)} className="w-full sm:flex-1">
            <option value="">Add a blocking task…</option>
            {candidates.map((c) => <option key={c.id} value={c.id}>{c.title}</option>)}
          </Select>
          <Button size="sm" variant="secondary" onClick={add} disabled={pending || !pick} className="w-full sm:w-auto"><Plus className="h-4 w-4" /> Add</Button>
        </div>
      )}

      {dependents.length > 0 && (
        <div>
          <p className="mb-1.5 text-caption text-text-muted">Blocks</p>
          <ul className="space-y-1">
            {dependents.map((d) => (
              <li key={d.id} className="flex items-center gap-2 rounded-sm border border-border bg-surface-2 px-2.5 py-1.5">
                <Link href={`/tasks/${d.taskId}`} className="flex-1 truncate text-body-sm text-text hover:text-accent">{d.title}</Link>
                <StatusBadge status={d.status} />
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
