'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createTask, updateTask } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea, FieldError } from '@/components/ui/textarea';
import { PRIORITY_ORDER, PRIORITY_META } from '@/lib/tasks/constants';
import type { ActionResult } from '@/lib/actions/result';

interface Defaults {
  title: string; description: string | null; priority: string; due_date: string | null;
  start_date: string | null; department_id: string | null; estimated_hours: number | null; tags: string[];
}

export function TaskForm({
  mode,
  taskId,
  defaults,
  assignees,
  parentTaskId,
}: {
  mode: 'create' | 'edit';
  taskId?: string;
  defaults?: Defaults;
  assignees: { id: string; full_name: string }[];
  parentTaskId?: string;
}) {
  const action = (mode === 'edit' ? updateTask.bind(null, taskId!) : createTask) as
    (prev: unknown, formData: FormData) => Promise<ActionResult>;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(mode === 'edit' ? 'Task updated' : 'Task created');
      router.push('/tasks');
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, mode, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      {parentTaskId && <input type="hidden" name="parent_task_id" value={parentTaskId} />}

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" defaultValue={defaults?.title} placeholder="What needs to be done?" required />
        <FieldError messages={fe?.title} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ''} placeholder="Context, acceptance criteria, links…" className="min-h-[120px]" />
        <FieldError messages={fe?.description} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue={defaults?.priority ?? 'P2'}>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="start_date">Start date</Label>
          <Input id="start_date" name="start_date" type="date" defaultValue={defaults?.start_date ?? ''} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="due_date">Due date</Label>
          <Input id="due_date" name="due_date" type="date" defaultValue={defaults?.due_date ?? ''} />
        </div>
      </div>

      {mode === 'create' && (
        <div className="space-y-1.5">
          <Label htmlFor="assignee_id">Assign to</Label>
          <Select id="assignee_id" name="assignee_id" defaultValue="">
            <option value="">— Unassigned —</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.full_name}</option>)}
          </Select>
        </div>
      )}

      <div className="space-y-1.5">
        <Label htmlFor="tags">Tags</Label>
        <Input id="tags" name="tags" defaultValue={defaults?.tags.join(', ')} placeholder="Comma-separated, e.g. backend, urgent" />
      </div>

      {state && !state.ok && !state.fieldErrors && <p className="text-caption text-danger">{state.error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create task'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
