'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { CalendarClock, Check } from 'lucide-react';
import { scheduleFollowup, completeFollowup } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { EmptyState } from '@/components/ui/states';
import { Badge } from '@/components/ui/badge';
import { FOLLOWUP_ORDER, FOLLOWUP_META } from '@/lib/leads/constants';
import type { ActionResult } from '@/lib/actions/result';
import type { FollowupType as FollowupTypeT } from '@/types/enums';

interface Followup { id: string; type: FollowupTypeT; due_date: string; note: string | null; done: boolean; assigneeName: string | null }

export function LeadFollowups({ leadId, followups, people }: { leadId: string; followups: Followup[]; people: { id: string; full_name: string }[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(scheduleFollowup.bind(null, leadId), { ok: false, error: '' } as ActionResult);
  const [cPending, startC] = useTransition();
  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    if (state.ok) { toast.success('Follow-up scheduled'); formRef.current?.reset(); router.refresh(); }
    else if (state.error) toast.error(state.error);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const complete = (id: string) => startC(async () => {
    const res = await completeFollowup(id, leadId);
    if (res.ok) { toast.success('Follow-up completed'); router.refresh(); } else toast.error(res.error);
  });

  const open = followups.filter((f) => !f.done);
  const done = followups.filter((f) => f.done);

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 sm:grid-cols-4">
        <div className="space-y-1"><Label>Type</Label>
          <Select name="type" defaultValue="EMAIL">{FOLLOWUP_ORDER.map((f) => <option key={f} value={f}>{FOLLOWUP_META[f].label}</option>)}</Select>
        </div>
        <div className="space-y-1"><Label>Date</Label><Input name="due_date" type="date" required defaultValue={today} /></div>
        <div className="space-y-1"><Label>Owner</Label>
          <Select name="assigned_to" defaultValue="">
            <option value="">Me</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
        </div>
        <div className="space-y-1 sm:col-span-4"><Label>Note (optional)</Label><Input name="note" placeholder="Ping on LinkedIn about the demo" /></div>
        <div className="sm:col-span-4 flex justify-end"><Button size="sm" type="submit" disabled={pending}><CalendarClock className="h-3.5 w-3.5" /> {pending ? 'Scheduling…' : 'Schedule follow-up'}</Button></div>
      </form>

      {open.length === 0 && done.length === 0 ? (
        <EmptyState icon={CalendarClock} title="No follow-ups" description="Schedule the next touch so this lead never goes cold." />
      ) : (
        <ul className="space-y-1.5">
          {open.map((f) => {
            const overdue = f.due_date < today;
            return (
              <li key={f.id} className="flex items-center gap-2 rounded-sm border border-border bg-surface-2/50 px-3 py-2">
                <Badge tone={overdue ? 'danger' : 'info'}>{FOLLOWUP_META[f.type].label}</Badge>
                <span className={`text-body-sm ${overdue ? 'text-danger' : 'text-text'}`}>{f.due_date}{overdue ? ' · overdue' : ''}</span>
                {f.note && <span className="truncate text-caption text-text-muted">— {f.note}</span>}
                <span className="ml-auto text-caption text-text-muted">{f.assigneeName ?? ''}</span>
                <Button size="sm" variant="secondary" disabled={cPending} onClick={() => complete(f.id)}><Check className="h-3.5 w-3.5" /> Done</Button>
              </li>
            );
          })}
          {done.map((f) => (
            <li key={f.id} className="flex items-center gap-2 rounded-sm border border-border px-3 py-2 opacity-60">
              <Badge tone="success">{FOLLOWUP_META[f.type].label}</Badge>
              <span className="text-body-sm text-text-secondary line-through">{f.due_date}</span>
              <span className="ml-auto text-caption text-success">Completed</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
