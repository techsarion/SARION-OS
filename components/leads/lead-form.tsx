'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { createLead, updateLead } from '@/lib/actions/leads';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input, Label } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { FieldError } from '@/components/ui/textarea';
import { STATUS_ORDER, STATUS_META, PRIORITY_ORDER, PRIORITY_META, RESEARCH_SOURCES } from '@/lib/leads/constants';
import type { ActionResult } from '@/lib/actions/result';

interface LeadRecord {
  id: string;
  [k: string]: unknown;
}

const initial: ActionResult = { ok: false, error: '' };

export function LeadForm({
  lead,
  people,
}: {
  lead?: LeadRecord;
  people: { id: string; full_name: string }[];
}) {
  const router = useRouter();
  const editing = !!lead;
  const action = editing
    ? updateLead.bind(null, lead!.id)
    : (createLead as unknown as (prev: unknown, fd: FormData) => Promise<ActionResult>);
  const [state, formAction, pending] = useActionState(action, initial);

  useEffect(() => {
    if (state.ok) {
      toast.success(editing ? 'Lead updated' : 'Lead created');
      const id = 'id' in state ? (state as { id?: string }).id : undefined;
      router.push(editing ? `/leads/${lead!.id}` : id ? `/leads/${id}` : '/leads');
      router.refresh();
    } else if (state.error) {
      toast.error(state.error);
    }
  }, [state]); // eslint-disable-line react-hooks/exhaustive-deps

  const fe = (state.ok ? undefined : state.fieldErrors) ?? {};
  const v = (k: string) => (lead?.[k] as string | null | undefined) ?? '';

  return (
    <form action={formAction} className="space-y-5">
      <Section title="Company">
        <Field label="Agency Name" required>
          <Input name="agency_name" defaultValue={v('agency_name')} placeholder="Acme Digital" required />
          <FieldError messages={fe.agency_name} />
        </Field>
        <Field label="Website"><Input name="website" defaultValue={v('website')} placeholder="acme.com" /></Field>
        <Field label="Country"><Input name="country" defaultValue={v('country')} /></Field>
        <Field label="City"><Input name="city" defaultValue={v('city')} /></Field>
        <Field label="Industry"><Input name="industry" defaultValue={v('industry')} placeholder="Marketing" /></Field>
        <Field label="Agency Size"><Input name="agency_size" defaultValue={v('agency_size')} placeholder="11–50" /></Field>
        <Field label="Services" full><Input name="services" defaultValue={v('services')} placeholder="SEO, Paid Ads, Web Design" /></Field>
        <Field label="LinkedIn Company" full><Input name="linkedin_company" defaultValue={v('linkedin_company')} /></Field>
      </Section>

      <Section title="Founder & Contact">
        <Field label="Founder Name"><Input name="founder_name" defaultValue={v('founder_name')} /></Field>
        <Field label="Founder LinkedIn"><Input name="founder_linkedin" defaultValue={v('founder_linkedin')} /></Field>
        <Field label="Contact Person"><Input name="contact_person" defaultValue={v('contact_person')} /></Field>
        <Field label="Position"><Input name="position" defaultValue={v('position')} placeholder="Head of Growth" /></Field>
        <Field label="Business Email">
          <Input name="business_email" type="email" defaultValue={v('business_email')} placeholder="hello@acme.com" />
          <FieldError messages={fe.business_email} />
        </Field>
        <Field label="Phone"><Input name="phone" defaultValue={v('phone')} /></Field>
        <Field label="Instagram"><Input name="instagram" defaultValue={v('instagram')} placeholder="@acme" /></Field>
        <Field label="Facebook"><Input name="facebook" defaultValue={v('facebook')} /></Field>
        <Field label="X (Twitter)"><Input name="x_handle" defaultValue={v('x_handle')} placeholder="@acme" /></Field>
      </Section>

      <Section title="Pipeline">
        <Field label="Status">
          <Select name="status" defaultValue={(v('status') as string) || 'RESEARCH'}>
            {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Select>
        </Field>
        <Field label="Priority">
          <Select name="priority" defaultValue={(v('priority') as string) || 'MEDIUM'}>
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{PRIORITY_META[p].label}</option>)}
          </Select>
        </Field>
        <Field label="Assigned To">
          <Select name="assigned_to" defaultValue={v('assigned_to')}>
            <option value="">Unassigned</option>
            {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </Select>
        </Field>
        <Field label="Research Source">
          <Select name="research_source" defaultValue={v('research_source')}>
            <option value="">—</option>
            {RESEARCH_SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </Field>
        <Field label="Next Follow-up"><Input name="next_followup" type="date" defaultValue={v('next_followup')} /></Field>
        <Field label="Demo Date"><Input name="demo_date" type="date" defaultValue={v('demo_date')} /></Field>
        <Field label="Tags (comma separated)" full>
          <Input name="tags" defaultValue={Array.isArray(lead?.tags) ? (lead!.tags as string[]).join(', ') : ''} placeholder="hot, agency, us" />
        </Field>
      </Section>

      <div className="flex items-center gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'Saving…' : editing ? 'Save changes' : 'Create lead'}</Button>
        <Button type="button" variant="ghost" onClick={() => router.back()}>Cancel</Button>
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent>
        <h3 className="mb-3 text-overline uppercase text-text-muted">{title}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{children}</div>
      </CardContent>
    </Card>
  );
}

function Field({ label, required, full, children }: { label: string; required?: boolean; full?: boolean; children: React.ReactNode }) {
  return (
    <div className={full ? 'space-y-1.5 sm:col-span-2' : 'space-y-1.5'}>
      <Label>{label}{required && <span className="text-danger"> *</span>}</Label>
      {children}
    </div>
  );
}
