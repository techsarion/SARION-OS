'use client';

import { useActionState, useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle2, Circle, Trash2, ArrowRightCircle, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  saveMeetingNotes,
  addActionItem,
  toggleActionItem,
  deleteActionItem,
  convertActionItemToTask,
  deleteMeeting,
} from '@/lib/actions/meetings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/states';
import { MEETING_TYPE_META } from '@/lib/meetings/constants';
import type { MeetingDetail } from '@/lib/server/data/meetings';
import type { ActionResult } from '@/lib/actions/result';
import { cn } from '@/lib/utils';

export function MeetingDetailView({
  meeting,
  people,
}: {
  meeting: MeetingDetail;
  people: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) =>
    start(async () => {
      const res = await fn();
      if (!res.ok) toast.error(res.error);
    });

  const typeMeta = MEETING_TYPE_META[meeting.type];
  const when = new Date(meeting.scheduledAt).toLocaleString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });

  return (
    <div className="mx-auto max-w-[900px] space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-h1">{meeting.title}</h1>
            <Badge tone={typeMeta.tone}>{typeMeta.label}</Badge>
          </div>
          <p className="mt-1 text-body-sm text-text-secondary">
            {when} · {meeting.durationMin} min · organized by {meeting.organizerName ?? 'Unknown'}
          </p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => {
            if (confirm('Delete this meeting? This cannot be undone.')) {
              run(async () => {
                const res = await deleteMeeting(meeting.id);
                if (res.ok) { toast.success('Meeting deleted'); router.push('/meetings'); }
                return res;
              });
            }
          }}
        >
          <Trash2 className="h-4 w-4" /> Delete
        </Button>
      </div>

      {meeting.agenda && (
        <Card>
          <CardHeader><CardTitle>Agenda</CardTitle></CardHeader>
          <CardContent className="whitespace-pre-wrap text-body-sm text-text-secondary">{meeting.agenda}</CardContent>
        </Card>
      )}

      {meeting.participants.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Participants</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {meeting.participants.map((p) => <Badge key={p.id} tone="neutral">{p.name}</Badge>)}
          </CardContent>
        </Card>
      )}

      <NotesCard meetingId={meeting.id} initial={meeting.notes} />

      <ActionItemsCard meeting={meeting} people={people} pending={pending} run={run} />
    </div>
  );
}

function NotesCard({ meetingId, initial }: { meetingId: string; initial: string | null }) {
  const [state, formAction, pending] = useActionState(
    saveMeetingNotes.bind(null, meetingId) as (prev: unknown, fd: FormData) => Promise<ActionResult>,
    null,
  );
  useEffect(() => {
    if (state?.ok) toast.success('Notes saved');
    else if (state && !state.ok) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader><CardTitle>Meeting Notes</CardTitle></CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-3">
          <Textarea name="notes" defaultValue={initial ?? ''} placeholder="Capture decisions, discussion, outcomes…" className="min-h-[140px]" />
          <Button type="submit" size="sm" disabled={pending}>{pending ? 'Saving…' : 'Save notes'}</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function ActionItemsCard({
  meeting,
  people,
  pending,
  run,
}: {
  meeting: MeetingDetail;
  people: { id: string; full_name: string }[];
  pending: boolean;
  run: (fn: () => Promise<{ ok: boolean; error?: string }>) => void;
}) {
  const [desc, setDesc] = useState('');
  const [assignee, setAssignee] = useState('');
  const [due, setDue] = useState('');

  const add = () => {
    if (!desc.trim()) return;
    run(async () => {
      const res = await addActionItem(meeting.id, desc, assignee || null, due || null);
      if (res.ok) { setDesc(''); setAssignee(''); setDue(''); }
      return res;
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Action Items</CardTitle>
        <Badge tone={meeting.actionItems.length ? 'accent' : 'neutral'}>{meeting.actionItems.length}</Badge>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} placeholder="What needs to happen next?" className="flex-1" />
          <Select value={assignee} onChange={(e) => setAssignee(e.target.value)} className="sm:w-40">
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
          <Input type="date" min={new Date().toISOString().slice(0, 10)} value={due} onChange={(e) => setDue(e.target.value)} className="sm:w-40" aria-label="Action item due date" />
          <Button type="button" size="md" onClick={add} disabled={pending || !desc.trim()}>
            <Plus className="h-4 w-4" /> Add
          </Button>
        </div>

        {meeting.actionItems.length === 0 ? (
          <EmptyState title="No action items yet" description="Add follow-ups above — you can convert any of them into a task." />
        ) : (
          <ul className="space-y-1.5">
            {meeting.actionItems.map((a) => (
              <li key={a.id} className={cn('flex items-center gap-2.5 rounded-sm border border-border bg-card px-3 py-2', a.done && 'opacity-70')}>
                <button
                  onClick={() => run(() => toggleActionItem(a.id, meeting.id, !a.done))}
                  disabled={pending}
                  aria-label={a.done ? 'Mark not done' : 'Mark done'}
                  className="shrink-0 text-text-muted transition-colors hover:text-success"
                >
                  {a.done ? <CheckCircle2 className="h-4 w-4 text-success" /> : <Circle className="h-4 w-4" />}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={cn('text-body-sm text-text', a.done && 'line-through text-text-muted')}>{a.description}</p>
                  <p className="text-caption text-text-muted">
                    {a.assigneeName ?? 'Unassigned'}
                    {a.dueDate && (
                      <span className={cn('ml-1.5', !a.done && a.dueDate < new Date().toISOString().slice(0, 10) ? 'text-danger' : 'text-text-muted')}>
                        · due {a.dueDate}
                      </span>
                    )}
                  </p>
                </div>
                {a.taskId ? (
                  <Link href={`/tasks/${a.taskId}`} className="shrink-0 text-caption text-accent hover:underline">View task</Link>
                ) : (
                  <button
                    onClick={() => run(async () => {
                      const res = await convertActionItemToTask(a.id, meeting.id);
                      if (res.ok) toast.success('Converted to task');
                      return res;
                    })}
                    disabled={pending}
                    className="inline-flex shrink-0 items-center gap-1 text-caption text-text-secondary transition-colors hover:text-accent"
                  >
                    <ArrowRightCircle className="h-3.5 w-3.5" /> To task
                  </button>
                )}
                <button
                  onClick={() => run(() => deleteActionItem(a.id, meeting.id))}
                  disabled={pending}
                  aria-label="Delete action item"
                  className="shrink-0 text-text-muted transition-colors hover:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
