'use client';

import { useActionState, useEffect, useRef, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { addLeadNote, deleteLeadNote } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/states';
import { StickyNote } from 'lucide-react';
import { timeAgo } from '@/lib/leads/format';
import type { ActionResult } from '@/lib/actions/result';

interface Note { id: string; body: string; created_at: string; authorName: string | null }

export function LeadNotes({ leadId, notes }: { leadId: string; notes: Note[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addLeadNote.bind(null, leadId), { ok: false, error: '' } as ActionResult);
  const [delPending, startDel] = useTransition();

  useEffect(() => {
    if (state.ok) { toast.success('Note added'); formRef.current?.reset(); router.refresh(); }
    else if (state.error) toast.error(state.error);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => startDel(async () => {
    const res = await deleteLeadNote(id, leadId);
    if (res.ok) { toast.success('Note deleted'); router.refresh(); } else toast.error(res.error);
  });

  return (
    <div className="space-y-3">
      <form ref={formRef} action={formAction} className="space-y-2">
        <Textarea name="body" placeholder="Add a note — e.g. “Founder replied and asked for pricing.”" required />
        <div className="flex justify-end"><Button size="sm" type="submit" disabled={pending}>{pending ? 'Saving…' : 'Add note'}</Button></div>
      </form>
      {notes.length === 0 ? (
        <EmptyState icon={StickyNote} title="No notes yet" description="Log what founders say, tools they use, and next steps." />
      ) : (
        <ul className="space-y-2">
          {notes.map((n) => (
            <li key={n.id} className="group rounded-sm border border-border bg-surface-2/50 p-3">
              <p className="whitespace-pre-wrap text-body-sm text-text">{n.body}</p>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-caption text-text-muted">{n.authorName ?? 'Someone'} · {timeAgo(n.created_at)}</span>
                <button onClick={() => remove(n.id)} disabled={delPending} className="text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" aria-label="Delete note">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
