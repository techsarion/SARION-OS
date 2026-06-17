'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateEmployee } from '@/lib/actions/employees';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/ui/textarea';
import { ROLE_LABEL } from '@/lib/roles';

const STATUSES: [string, string][] = [
  ['ACTIVE', 'Active'], ['ON_LEAVE', 'On leave'], ['RESIGNED', 'Resigned'], ['TERMINATED', 'Terminated'],
];

interface Defaults {
  role: string; status: string; designation: string | null;
  department_id: string | null; team_id: string | null; manager_id: string | null;
}

export function EmployeeAdminForm({
  employeeId,
  defaults,
  departments,
  teams,
  managers,
}: {
  employeeId: string;
  defaults: Defaults;
  departments: { id: string; name: string }[];
  teams: { id: string; name: string }[];
  managers: { id: string; full_name: string }[];
}) {
  const [state, formAction, pending] = useActionState(updateEmployee.bind(null, employeeId), null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Employee updated');
      router.refresh();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role">Role</Label>
          <Select id="role" name="role" defaultValue={defaults.role}>
            {Object.entries(ROLE_LABEL).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Select>
          <FieldError messages={fe?.role} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="status">Employment status</Label>
          <Select id="status" name="status" defaultValue={defaults.status}>
            {STATUSES.map(([v, label]) => <option key={v} value={v}>{label}</option>)}
          </Select>
          <FieldError messages={fe?.status} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="designation">Designation</Label>
        <Input id="designation" name="designation" defaultValue={defaults.designation ?? ''} placeholder="e.g. Senior Engineer" />
        <FieldError messages={fe?.designation} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department_id">Department</Label>
          <Select id="department_id" name="department_id" defaultValue={defaults.department_id ?? ''}>
            <option value="">— None —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team_id">Team</Label>
          <Select id="team_id" name="team_id" defaultValue={defaults.team_id ?? ''}>
            <option value="">— None —</option>
            {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manager_id">Reports to</Label>
        <Select id="manager_id" name="manager_id" defaultValue={defaults.manager_id ?? ''}>
          <option value="">— No manager —</option>
          {managers.map((m) => <option key={m.id} value={m.id}>{m.full_name}</option>)}
        </Select>
        <FieldError messages={fe?.manager_id} />
      </div>

      {state && !state.ok && !state.fieldErrors && <p className="text-caption text-danger">{state.error}</p>}
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save changes'}</Button>
    </form>
  );
}
