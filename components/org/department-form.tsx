'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createDepartment, updateDepartment } from '@/lib/actions/departments';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea, FieldError } from '@/components/ui/textarea';

interface Person { id: string; full_name: string }
interface Defaults { name: string; description: string | null; head_id: string | null }

export function DepartmentForm({
  mode,
  departmentId,
  defaults,
  heads,
}: {
  mode: 'create' | 'edit';
  departmentId?: string;
  defaults?: Defaults;
  heads: Person[];
}) {
  // Both branches surface the same {ok,error} shape the form reads; the create
  // variant additionally returns an id we don't need here.
  const action = (mode === 'edit' ? updateDepartment.bind(null, departmentId!) : createDepartment) as
    (prev: unknown, formData: FormData) => Promise<import('@/lib/actions/result').ActionResult>;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(mode === 'edit' ? 'Department updated' : 'Department created');
      router.push('/departments');
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, mode, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Department name</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} placeholder="e.g. Engineering" required />
        <FieldError messages={fe?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ''} placeholder="What this department owns…" />
        <FieldError messages={fe?.description} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="head_id">Department head</Label>
        <Select id="head_id" name="head_id" defaultValue={defaults?.head_id ?? ''}>
          <option value="">— Unassigned —</option>
          {heads.map((h) => <option key={h.id} value={h.id}>{h.full_name}</option>)}
        </Select>
        <FieldError messages={fe?.head_id} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create department'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/departments')}>Cancel</Button>
      </div>
    </form>
  );
}
