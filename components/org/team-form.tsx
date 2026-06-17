'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createTeam, updateTeam } from '@/lib/actions/teams';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea, FieldError } from '@/components/ui/textarea';

interface Option { id: string; name?: string; full_name?: string }
interface Defaults { name: string; description: string | null; department_id: string; lead_id: string | null }

export function TeamForm({
  mode,
  teamId,
  defaults,
  departments,
  leads,
}: {
  mode: 'create' | 'edit';
  teamId?: string;
  defaults?: Defaults;
  departments: { id: string; name: string }[];
  leads: { id: string; full_name: string }[];
}) {
  const action = (mode === 'edit' ? updateTeam.bind(null, teamId!) : createTeam) as
    (prev: unknown, formData: FormData) => Promise<import('@/lib/actions/result').ActionResult>;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success(mode === 'edit' ? 'Team updated' : 'Team created');
      router.push('/teams');
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, mode, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="space-y-1.5">
        <Label htmlFor="name">Team name</Label>
        <Input id="name" name="name" defaultValue={defaults?.name} placeholder="e.g. Platform" required />
        <FieldError messages={fe?.name} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="department_id">Department</Label>
        <Select id="department_id" name="department_id" defaultValue={defaults?.department_id ?? ''} required>
          <option value="">— Select department —</option>
          {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
        <FieldError messages={fe?.department_id} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={defaults?.description ?? ''} placeholder="What this team focuses on…" />
        <FieldError messages={fe?.description} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="lead_id">Team lead</Label>
        <Select id="lead_id" name="lead_id" defaultValue={defaults?.lead_id ?? ''}>
          <option value="">— Unassigned —</option>
          {leads.map((l) => <option key={l.id} value={l.id}>{l.full_name}</option>)}
        </Select>
        <FieldError messages={fe?.lead_id} />
      </div>
      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Create team'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/teams')}>Cancel</Button>
      </div>
    </form>
  );
}
