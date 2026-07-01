'use server';
// Lead Management — CRUD, pipeline status, assignment, notes, follow-ups,
// outreach tracking, tags, and bulk actions. Every mutation runs through RBAC
// (guard), RLS, audit logging (audit_log + lead_activities), and the
// ActionResult contract. Mirrors lib/actions/tasks.ts.
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { logActivity } from '@/lib/server/activity';
import { logLeadActivity } from '@/lib/server/leads-activity';
import { guard } from '@/lib/server/guard';
import { LeadStatus, LeadPriority, FollowupType } from '@/types/enums';
import type { LeadStatus as LeadStatusT, LeadPriority as LeadPriorityT, FollowupType as FollowupTypeT } from '@/types/enums';
import { ok, fail, failFrom, type ActionResult } from '@/lib/actions/result';
import type { Database } from '@/types/database.types';

type LeadInsert = Database['public']['Tables']['leads']['Insert'];
type LeadUpdate = Database['public']['Tables']['leads']['Update'];

const LEAD_STATUSES = Object.values(LeadStatus) as [LeadStatusT, ...LeadStatusT[]];
const LEAD_PRIORITIES = Object.values(LeadPriority) as [LeadPriorityT, ...LeadPriorityT[]];
const FOLLOWUP_TYPES = Object.values(FollowupType) as [FollowupTypeT, ...FollowupTypeT[]];

const opt = () => z.string().optional().or(z.literal('')).transform((v) => (v ? v : null));

// ───────────── schema ─────────────
const leadSchema = z.object({
  agency_name: z.string().min(2, 'Give the agency a name.').max(200),
  website: opt(), country: opt(), city: opt(), industry: opt(), agency_size: opt(), services: opt(),
  linkedin_company: opt(), founder_name: opt(), founder_linkedin: opt(), contact_person: opt(),
  position: opt(), business_email: z.string().email('Enter a valid email.').optional().or(z.literal('')).transform((v) => v || null),
  phone: opt(), instagram: opt(), facebook: opt(), x_handle: opt(), research_source: opt(),
  status: z.enum(LEAD_STATUSES).default(LeadStatus.RESEARCH),
  priority: z.enum(LEAD_PRIORITIES).default(LeadPriority.MEDIUM),
  assigned_to: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
  next_followup: opt(), demo_date: opt(),
  tags: z.string().optional().transform((v) => (v ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
});

// ───────────── create ─────────────
export async function createLead(_prev: unknown, formData: FormData): Promise<ActionResult<{ id: string }>> {
  const g = await guard('lead:create');
  if (!g.ok) return g.error;
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const row: LeadInsert = {
      ...d,
      status: d.assigned_to && d.status === LeadStatus.RESEARCH ? LeadStatus.ASSIGNED : d.status,
      created_by: g.user.id, updated_by: g.user.id,
    };
    const { data: created, error } = await supabase.from('leads').insert(row as never).select('id').single<{ id: string }>();
    if (error || !created) return fail(error?.message ?? 'Could not create the lead.');
    await logLeadActivity(created.id, g.user.id, 'created', { agency: d.agency_name });
    if (d.assigned_to) await logLeadActivity(created.id, g.user.id, 'assigned', { to: d.assigned_to });
    await logActivity({ action: 'lead.create', resourceType: 'lead', resourceId: created.id, after: { agency_name: d.agency_name, status: row.status } });
    revalidatePath('/leads');
    return ok({ id: created.id });
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── update ─────────────
export async function updateLead(id: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  const parsed = leadSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const patch: LeadUpdate = { ...d, updated_by: g.user.id };
    const { error } = await supabase.from('leads').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logLeadActivity(id, g.user.id, 'updated');
    await logActivity({ action: 'lead.update', resourceType: 'lead', resourceId: id });
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── status (pipeline) ─────────────
export async function setLeadStatus(id: string, to: LeadStatusT): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: current } = await supabase.from('leads').select('status').eq('id', id).maybeSingle<{ status: LeadStatusT }>();
    if (!current) return fail('Lead not found.');
    if (current.status === to) return ok();

    const patch: LeadUpdate = { status: to, updated_by: g.user.id, last_contact_date: new Date().toISOString().slice(0, 10) };
    // Stamp customer_since when a lead is Won.
    if (to === LeadStatus.WON) patch.customer_since = new Date().toISOString().slice(0, 10);
    const { error } = await supabase.from('leads').update(patch as never).eq('id', id);
    if (error) return fail(error.message);

    await logLeadActivity(id, g.user.id, 'status_changed', { from: current.status, to });
    await logActivity({ action: 'lead.status', resourceType: 'lead', resourceId: id, before: { status: current.status }, after: { status: to } });
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── assignment ─────────────
export async function assignLead(id: string, assigneeId: string | null): Promise<ActionResult> {
  const g = await guard('lead:assign');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { data: current } = await supabase.from('leads').select('assigned_to, status').eq('id', id).maybeSingle<{ assigned_to: string | null; status: LeadStatusT }>();
    if (!current) return fail('Lead not found.');
    const patch: LeadUpdate = {
      assigned_to: assigneeId, updated_by: g.user.id,
      status: assigneeId && (current.status === LeadStatus.RESEARCH || current.status === LeadStatus.IMPORTED) ? LeadStatus.ASSIGNED : current.status,
    };
    const { error } = await supabase.from('leads').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    const reassigned = !!current.assigned_to && current.assigned_to !== assigneeId;
    await logLeadActivity(id, g.user.id, reassigned ? 'reassigned' : 'assigned', { to: assigneeId });
    await logActivity({ action: 'lead.assign', resourceType: 'lead', resourceId: id, before: { assigned_to: current.assigned_to }, after: { assigned_to: assigneeId } });
    revalidatePath('/leads');
    revalidatePath(`/leads/${id}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── delete (soft) ─────────────
export async function deleteLead(id: string): Promise<ActionResult> {
  const g = await guard('lead:delete');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch: LeadUpdate = { deleted_at: new Date().toISOString() };
    const { error } = await supabase.from('leads').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    await logActivity({ action: 'lead.delete', resourceType: 'lead', resourceId: id });
    revalidatePath('/leads');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── notes ─────────────
const noteSchema = z.object({ body: z.string().min(1, 'Write a note.').max(5000) });

export async function addLeadNote(leadId: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  const parsed = noteSchema.safeParse({ body: formData.get('body') });
  if (!parsed.success) return fail(parsed.error.issues[0]?.message ?? 'Invalid note.');
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('lead_notes').insert({ lead_id: leadId, author_id: user.id, body: parsed.data.body } as never);
    if (error) return fail(error.message);
    await logLeadActivity(leadId, user.id, 'note_added');
    revalidatePath(`/leads/${leadId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteLeadNote(id: string, leadId: string): Promise<ActionResult> {
  const user = await getCurrentUser();
  if (!user) return fail('You must be signed in.', { code: 'unauthenticated' });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('lead_notes').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/leads/${leadId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── follow-ups ─────────────
const followupSchema = z.object({
  type: z.enum(FOLLOWUP_TYPES).default(FollowupType.EMAIL),
  due_date: z.string().min(1, 'Pick a date.'),
  note: opt(),
  assigned_to: z.string().uuid().optional().or(z.literal('')).transform((v) => v || null),
});

export async function scheduleFollowup(leadId: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  const parsed = followupSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  const d = parsed.data;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('lead_followups').insert({
      lead_id: leadId, type: d.type, due_date: d.due_date, note: d.note,
      created_by: g.user.id, assigned_to: d.assigned_to ?? g.user.id,
    } as never);
    if (error) return fail(error.message);
    // Reflect the EARLIEST open follow-up on the lead (not necessarily the one
    // just added) so the dashboard/list surface the soonest due date.
    const { data: next } = await supabase.from('lead_followups').select('due_date').eq('lead_id', leadId).eq('done', false).order('due_date').limit(1).maybeSingle<{ due_date: string }>();
    const patch: LeadUpdate = { next_followup: next?.due_date ?? d.due_date };
    await supabase.from('leads').update(patch as never).eq('id', leadId);
    await logLeadActivity(leadId, g.user.id, 'followup_scheduled', { type: d.type, due: d.due_date });
    await logActivity({ action: 'lead.followup', resourceType: 'lead', resourceId: leadId, after: { type: d.type, due_date: d.due_date } });
    revalidatePath(`/leads/${leadId}`);
    revalidatePath('/leads');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function completeFollowup(id: string, leadId: string): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const patch = { done: true, done_at: new Date().toISOString() };
    const { error } = await supabase.from('lead_followups').update(patch as never).eq('id', id);
    if (error) return fail(error.message);
    // Recompute the lead's next open follow-up.
    const { data: next } = await supabase.from('lead_followups').select('due_date').eq('lead_id', leadId).eq('done', false).order('due_date').limit(1).maybeSingle<{ due_date: string }>();
    const leadPatch: LeadUpdate = { next_followup: next?.due_date ?? null };
    await supabase.from('leads').update(leadPatch as never).eq('id', leadId);
    await logLeadActivity(leadId, g.user.id, 'followup_completed');
    revalidatePath(`/leads/${leadId}`);
    revalidatePath('/leads');
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── outreach tracking ─────────────
// Each key maps to a lead column; toggling stamps/clears a timestamp (or boolean
// for cold_email_opened) and records a timeline entry.
const OUTREACH_FIELDS = {
  li_requested_at: 'LinkedIn request sent',
  li_connected_at: 'LinkedIn connected',
  li_first_msg_at: 'LinkedIn first message',
  cold_email_sent_at: 'Cold email sent',
  cold_email_replied_at: 'Cold email replied',
  ig_dm_sent_at: 'Instagram DM sent',
  ig_replied_at: 'Instagram replied',
  fb_dm_sent_at: 'Facebook DM sent',
  fb_replied_at: 'Facebook replied',
  x_dm_sent_at: 'X DM sent',
  x_replied_at: 'X replied',
} as const;
export type OutreachField = keyof typeof OUTREACH_FIELDS;

export async function setOutreach(leadId: string, field: OutreachField | 'cold_email_opened', on: boolean): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  if (field !== 'cold_email_opened' && !(field in OUTREACH_FIELDS)) return fail('Unknown outreach field.');
  try {
    const supabase = await createClient();
    const patch: Record<string, unknown> = { updated_by: g.user.id };
    if (field === 'cold_email_opened') {
      patch.cold_email_opened = on;
    } else {
      patch[field] = on ? new Date().toISOString() : null;
    }
    const { error } = await supabase.from('leads').update(patch as never).eq('id', leadId);
    if (error) return fail(error.message);
    const label = field === 'cold_email_opened' ? 'Cold email opened' : OUTREACH_FIELDS[field];
    if (on) await logLeadActivity(leadId, g.user.id, 'outreach', { event: label });
    await logActivity({ action: 'lead.outreach', resourceType: 'lead', resourceId: leadId, after: { field, on } });
    revalidatePath(`/leads/${leadId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── contacts ─────────────
const contactSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(160),
  position: opt(), email: opt(), phone: opt(), linkedin: opt(),
});

export async function addLeadContact(leadId: string, _prev: unknown, formData: FormData): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  const parsed = contactSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return fail('Please fix the highlighted fields.', { fieldErrors: parsed.error.flatten().fieldErrors });
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('lead_contacts').insert({ lead_id: leadId, ...parsed.data } as never);
    if (error) return fail(error.message);
    await logLeadActivity(leadId, g.user.id, 'contact_added', { name: parsed.data.name });
    revalidatePath(`/leads/${leadId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

export async function deleteLeadContact(id: string, leadId: string): Promise<ActionResult> {
  const g = await guard('lead:update');
  if (!g.ok) return g.error;
  try {
    const supabase = await createClient();
    const { error } = await supabase.from('lead_contacts').delete().eq('id', id);
    if (error) return fail(error.message);
    revalidatePath(`/leads/${leadId}`);
    return ok();
  } catch (err) {
    return failFrom(err);
  }
}

// ───────────── bulk actions ─────────────
type BulkAction =
  | { kind: 'assign'; assigneeId: string | null }
  | { kind: 'status'; status: LeadStatusT }
  | { kind: 'tag'; tag: string }
  | { kind: 'followup'; due_date: string; ftype: FollowupTypeT }
  | { kind: 'archive' }
  | { kind: 'delete' };

export async function bulkLeadAction(ids: string[], action: BulkAction): Promise<ActionResult<{ count: number }>> {
  const perm = action.kind === 'delete' ? 'lead:delete' : action.kind === 'assign' ? 'lead:assign' : 'lead:update';
  const g = await guard(perm);
  if (!g.ok) return g.error;
  if (!ids.length) return fail('Select at least one lead.');
  try {
    const supabase = await createClient();
    const now = new Date().toISOString();
    if (action.kind === 'delete') {
      const { error } = await supabase.from('leads').update({ deleted_at: now } as never).in('id', ids);
      if (error) return fail(error.message);
    } else if (action.kind === 'archive') {
      const { error } = await supabase.from('leads').update({ status: LeadStatus.ARCHIVED, updated_by: g.user.id } as never).in('id', ids);
      if (error) return fail(error.message);
    } else if (action.kind === 'assign') {
      const { error } = await supabase.from('leads').update({ assigned_to: action.assigneeId, updated_by: g.user.id } as never).in('id', ids);
      if (error) return fail(error.message);
    } else if (action.kind === 'status') {
      const { error } = await supabase.from('leads').update({ status: action.status, updated_by: g.user.id } as never).in('id', ids);
      if (error) return fail(error.message);
    } else if (action.kind === 'tag') {
      // Append the tag to each selected lead (dedup client-safe via SQL array).
      const { data: rows } = await supabase.from('leads').select('id, tags').in('id', ids);
      for (const r of (rows ?? []) as { id: string; tags: string[] }[]) {
        const next = Array.from(new Set([...(r.tags ?? []), action.tag]));
        await supabase.from('leads').update({ tags: next } as never).eq('id', r.id);
      }
    } else if (action.kind === 'followup') {
      const inserts = ids.map((leadId) => ({ lead_id: leadId, type: action.ftype, due_date: action.due_date, created_by: g.user.id, assigned_to: g.user.id }));
      const { error } = await supabase.from('lead_followups').insert(inserts as never);
      if (error) return fail(error.message);
      await supabase.from('leads').update({ next_followup: action.due_date } as never).in('id', ids);
    }
    for (const id of ids) await logLeadActivity(id, g.user.id, `bulk_${action.kind}`, action);
    await logActivity({ action: `lead.bulk.${action.kind}`, resourceType: 'lead', after: { ids, count: ids.length } });
    revalidatePath('/leads');
    return ok({ count: ids.length });
  } catch (err) {
    return failFrom(err);
  }
}
