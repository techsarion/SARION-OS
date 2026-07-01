'use client';

import { useActionState, useEffect, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Plus, Trash2, Mail, Phone, Linkedin } from 'lucide-react';
import { addLeadContact, deleteLeadContact } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ensureUrl } from '@/lib/leads/format';
import type { ActionResult } from '@/lib/actions/result';

interface Contact { id: string; name: string; position: string | null; email: string | null; phone: string | null; linkedin: string | null; is_primary: boolean }

export function LeadContacts({ leadId, contacts }: { leadId: string; contacts: Contact[] }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(addLeadContact.bind(null, leadId), { ok: false, error: '' } as ActionResult);
  const [delPending, startDel] = useTransition();

  useEffect(() => {
    if (state.ok) { toast.success('Contact added'); formRef.current?.reset(); setAdding(false); router.refresh(); }
    else if (state.error) toast.error(state.error);
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = (id: string) => startDel(async () => {
    const res = await deleteLeadContact(id, leadId);
    if (res.ok) { toast.success('Contact removed'); router.refresh(); } else toast.error(res.error);
  });

  return (
    <div className="space-y-2.5">
      {contacts.length > 0 && (
        <ul className="space-y-2">
          {contacts.map((c) => {
            const li = ensureUrl(c.linkedin);
            return (
              <li key={c.id} className="group flex items-start justify-between gap-2 rounded-sm border border-border bg-surface-2/50 p-3">
                <div className="min-w-0">
                  <p className="text-body-sm font-medium text-text">{c.name}{c.position && <span className="font-normal text-text-muted"> · {c.position}</span>}</p>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-caption text-text-secondary">
                    {c.email && <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 hover:text-accent"><Mail className="h-3 w-3" />{c.email}</a>}
                    {c.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" />{c.phone}</span>}
                    {li && <a href={li} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-accent"><Linkedin className="h-3 w-3" />LinkedIn</a>}
                  </div>
                </div>
                <button onClick={() => remove(c.id)} disabled={delPending} className="text-text-muted opacity-0 transition-opacity hover:text-danger group-hover:opacity-100" aria-label="Remove contact">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <form ref={formRef} action={formAction} className="grid grid-cols-1 gap-2 rounded-sm border border-border p-3 sm:grid-cols-2">
          <Input name="name" placeholder="Name *" required />
          <Input name="position" placeholder="Position" />
          <Input name="email" placeholder="Email" />
          <Input name="phone" placeholder="Phone" />
          <Input name="linkedin" placeholder="LinkedIn URL" className="sm:col-span-2" />
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" type="submit" disabled={pending}>{pending ? 'Adding…' : 'Add contact'}</Button>
            <Button size="sm" type="button" variant="ghost" onClick={() => setAdding(false)}>Cancel</Button>
          </div>
        </form>
      ) : (
        <Button size="sm" variant="secondary" onClick={() => setAdding(true)}><Plus className="h-3.5 w-3.5" /> Add contact</Button>
      )}
    </div>
  );
}
