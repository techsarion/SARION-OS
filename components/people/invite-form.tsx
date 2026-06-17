'use client';

import { useActionState, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { inviteMember } from '@/lib/actions/invitations';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/ui/textarea';
import { ROLE_LABEL } from '@/lib/roles';
import { Role } from '@/types/enums';

const ASSIGNABLE = [Role.MANAGING_DIRECTOR, Role.DEPARTMENT_HEAD, Role.TEAM_LEAD, Role.MARKETING_OFFICER, Role.EMPLOYEE, Role.GUEST];

export function InviteForm({
  departments,
  teams,
}: {
  departments: { id: string; name: string }[];
  teams: { id: string; name: string; department_id: string }[];
}) {
  const [state, formAction, pending] = useActionState(inviteMember, null);
  const [dept, setDept] = useState('');
  const router = useRouter();

  const deptTeams = useMemo(() => teams.filter((t) => t.department_id === dept), [teams, dept]);

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Invitation sent');
      router.push('/employees');
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="max-w-xl space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" placeholder="Jordan Lee" required />
          <FieldError messages={fe?.full_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Work email</Label>
          <Input id="email" name="email" type="email" placeholder="jordan@company.com" required />
          <FieldError messages={fe?.email} />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="role">Role</Label>
        <Select id="role" name="role" defaultValue={Role.EMPLOYEE} required>
          {ASSIGNABLE.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
        </Select>
        <FieldError messages={fe?.role} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="department_id">Department</Label>
          <Select id="department_id" name="department_id" value={dept} onChange={(e) => setDept(e.target.value)}>
            <option value="">— None —</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="team_id">Team</Label>
          <Select id="team_id" name="team_id" disabled={!dept}>
            <option value="">— None —</option>
            {deptTeams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </Select>
        </div>
      </div>

      {state && !state.ok && !state.fieldErrors && <p className="text-caption text-danger">{state.error}</p>}

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Sending…' : (<><Send className="h-4 w-4" /> Send invitation</>)}</Button>
        <Button type="button" variant="ghost" onClick={() => router.push('/employees')}>Cancel</Button>
      </div>
      <p className="text-caption text-text-muted">
        We’ll email a secure invitation link (valid 7 days). The person sets their own password on acceptance.
      </p>
    </form>
  );
}
