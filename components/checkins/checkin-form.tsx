'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { saveCheckIn, saveEndOfDay } from '@/lib/actions/checkins';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import type { CheckIn } from '@/lib/server/data/checkins';
import type { ActionResult } from '@/lib/actions/result';

type Field = { name: string; label: string; placeholder: string };

const MORNING_FIELDS: Field[] = [
  { name: 'focus', label: "Today's focus", placeholder: 'The one thing that matters most today…' },
  { name: 'priorities', label: "Today's priorities", placeholder: 'Top 3 priorities, one per line…' },
  { name: 'blockers', label: 'Blockers', placeholder: "Anything in your way? (leave blank if none)" },
  { name: 'progress', label: 'Progress updates', placeholder: 'Where things stand right now…' },
];

const EOD_FIELDS: Field[] = [
  { name: 'completed', label: 'Completed work', placeholder: 'What you finished today…' },
  { name: 'unfinished', label: 'Unfinished work', placeholder: "What's still open / carrying over…" },
  { name: 'blockers', label: 'Blockers', placeholder: 'What slowed you down?' },
  { name: 'notes', label: 'Notes', placeholder: 'Anything worth recording…' },
];

export function CheckInForm({ kind, existing }: { kind: 'MORNING' | 'EOD'; existing: CheckIn | null }) {
  const action = (kind === 'MORNING' ? saveCheckIn : saveEndOfDay) as (prev: unknown, fd: FormData) => Promise<ActionResult>;
  const [state, formAction, pending] = useActionState(action, null);
  const router = useRouter();
  const fields = kind === 'MORNING' ? MORNING_FIELDS : EOD_FIELDS;

  useEffect(() => {
    if (state?.ok) { toast.success(kind === 'MORNING' ? 'Check-in saved' : 'End-of-day saved'); router.refresh(); }
    else if (state && !state.ok) toast.error(state.error);
  }, [state, kind, router]);

  const defaultOf = (name: string) => (existing ? (existing as unknown as Record<string, string | null>)[name] ?? '' : '');

  return (
    <form action={formAction} className="space-y-4">
      {fields.map((f) => (
        <div key={f.name} className="space-y-1.5">
          <Label htmlFor={f.name}>{f.label}</Label>
          <Textarea id={f.name} name={f.name} defaultValue={defaultOf(f.name)} placeholder={f.placeholder} className="min-h-[72px]" />
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : existing ? 'Update' : 'Save'}</Button>
        {existing && <span className="text-caption text-text-muted">Last saved {new Date(existing.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>}
      </div>
    </form>
  );
}
