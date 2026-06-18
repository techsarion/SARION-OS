'use client';

import { useActionState, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createMeeting } from '@/lib/actions/meetings';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea, FieldError } from '@/components/ui/textarea';
import { MEETING_TYPE_ORDER, MEETING_TYPE_META } from '@/lib/meetings/constants';
import type { ActionResult } from '@/lib/actions/result';
import { cn } from '@/lib/utils';

export function MeetingForm({
  people,
  currentUserId,
}: {
  people: { id: string; full_name: string }[];
  currentUserId: string;
}) {
  const [state, formAction, pending] = useActionState(
    createMeeting as (prev: unknown, fd: FormData) => Promise<ActionResult<{ id: string }>>,
    null,
  );
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  // Local "now" for the datetime-local min (best-effort; server also validates).
  const minDt = (() => { const n = new Date(); n.setMinutes(n.getMinutes() - n.getTimezoneOffset()); return n.toISOString().slice(0, 16); })();

  useEffect(() => {
    if (state?.ok) {
      toast.success('Meeting created');
      router.push(`/meetings/${state.id}`);
    } else if (state && !state.ok && !state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;
  const toggle = (id: string) => setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  return (
    <form action={formAction} className="max-w-2xl space-y-5">
      <input type="hidden" name="participant_ids" value={selected.join(',')} />

      <div className="space-y-1.5">
        <Label htmlFor="title">Title</Label>
        <Input id="title" name="title" placeholder="e.g. Weekly review" required />
        <FieldError messages={fe?.title} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="type">Type</Label>
          <Select id="type" name="type" defaultValue="STANDUP">
            {MEETING_TYPE_ORDER.map((t) => <option key={t} value={t}>{MEETING_TYPE_META[t].label}</option>)}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="duration_min">Duration (min)</Label>
          <Input id="duration_min" name="duration_min" type="number" min={5} step={5} defaultValue={30} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="scheduled_at">Date &amp; time</Label>
          <Input id="scheduled_at" name="scheduled_at" type="datetime-local" min={minDt} required />
          <FieldError messages={fe?.scheduled_at} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="recurrence">Repeat</Label>
          <Select id="recurrence" name="recurrence" defaultValue="NONE">
            <option value="NONE">Does not repeat</option>
            <option value="DAILY">Daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="MONTHLY">Monthly</option>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="agenda">Agenda</Label>
        <Textarea id="agenda" name="agenda" placeholder="Discussion points, one per line…" className="min-h-[100px]" />
      </div>

      <div className="space-y-1.5">
        <Label>Participants</Label>
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {people.filter((p) => p.id !== currentUserId).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => toggle(p.id)}
              className={cn(
                'flex items-center justify-between rounded-sm border px-3 py-2 text-body-sm transition-colors',
                selected.includes(p.id)
                  ? 'border-accent bg-accent-soft text-text'
                  : 'border-border text-text-secondary hover:border-text-muted hover:text-text',
              )}
            >
              {p.full_name}
              {selected.includes(p.id) && <span className="text-caption text-accent">Added</span>}
            </button>
          ))}
        </div>
        <p className="text-caption text-text-muted">You&apos;re added automatically as the organizer.</p>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button type="submit" disabled={pending}>{pending ? 'Creating…' : 'Create meeting'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}
