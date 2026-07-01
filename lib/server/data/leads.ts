import 'server-only';
// Read layer for the Lead Management module. RLS is all-authenticated (small
// all-admin team), so queries return the whole team's leads. Results are cast to
// explicit shapes (the pinned supabase client degrades inferred types to `never`).
import { createClient } from '@/lib/supabase/server';
import { OPEN_STATUSES } from '@/lib/leads/constants';
import type { LeadStatus as LeadStatusT, LeadPriority as LeadPriorityT, FollowupType as FollowupTypeT } from '@/types/enums';

const todayISO = () => new Date().toISOString().slice(0, 10);
function inDays(n: number) { return new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10); }

export interface LeadListItem {
  id: string;
  agency_name: string;
  website: string | null;
  country: string | null;
  city: string | null;
  industry: string | null;
  business_email: string | null;
  founder_linkedin: string | null;
  linkedin_company: string | null;
  contact_person: string | null;
  status: LeadStatusT;
  priority: LeadPriorityT;
  assignedTo: string | null;
  assigneeName: string | null;
  assigneeAvatar: string | null;
  tags: string[];
  next_followup: string | null;
  demo_date: string | null;
  last_contact_date: string | null;
  created_at: string;
  isFollowupOverdue: boolean;
}

interface ProfileLite { id: string; full_name: string; avatar_url: string | null }

async function profileMap(): Promise<Map<string, ProfileLite>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
  const rows = (data ?? []) as ProfileLite[];
  return new Map(rows.map((p) => [p.id, p]));
}

export async function getTeamProfiles(): Promise<{ id: string; full_name: string }[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name').eq('status', 'ACTIVE').order('full_name');
  return (data ?? []) as { id: string; full_name: string }[];
}

type LeadListSelect = {
  id: string; agency_name: string; website: string | null; country: string | null; city: string | null;
  industry: string | null; business_email: string | null; founder_linkedin: string | null;
  linkedin_company: string | null; contact_person: string | null; status: LeadStatusT; priority: LeadPriorityT;
  assigned_to: string | null; tags: string[]; next_followup: string | null; demo_date: string | null;
  last_contact_date: string | null; created_at: string;
};

const LIST_COLS =
  'id, agency_name, website, country, city, industry, business_email, founder_linkedin, linkedin_company, contact_person, status, priority, assigned_to, tags, next_followup, demo_date, last_contact_date, created_at';

export async function getLeads(): Promise<LeadListItem[]> {
  const supabase = await createClient();
  const [leadRes, people] = await Promise.all([
    supabase.from('leads').select(LIST_COLS).is('deleted_at', null).order('created_at', { ascending: false }),
    profileMap(),
  ]);
  const rows = (leadRes.data ?? []) as LeadListSelect[];
  const today = todayISO();
  return rows.map((l) => {
    const a = l.assigned_to ? people.get(l.assigned_to) : null;
    return {
      ...l,
      assignedTo: l.assigned_to,
      assigneeName: a?.full_name ?? null,
      assigneeAvatar: a?.avatar_url ?? null,
      isFollowupOverdue: !!l.next_followup && l.next_followup < today,
    };
  });
}

// ───────────── detail ─────────────
export interface LeadDetail {
  lead: Record<string, unknown> & { id: string; agency_name: string; status: LeadStatusT; priority: LeadPriorityT };
  assigneeName: string | null;
  importedByName: string | null;
  createdByName: string | null;
  contacts: { id: string; name: string; position: string | null; email: string | null; phone: string | null; linkedin: string | null; is_primary: boolean }[];
  notes: { id: string; body: string; created_at: string; authorName: string | null }[];
  activities: { id: string; verb: string; meta: unknown; created_at: string; actorName: string | null }[];
  followups: { id: string; type: FollowupTypeT; due_date: string; note: string | null; done: boolean; assigneeName: string | null }[];
}

export async function getLeadDetail(id: string): Promise<LeadDetail | null> {
  const supabase = await createClient();
  const { data: lead } = await supabase.from('leads').select('*').eq('id', id).is('deleted_at', null).maybeSingle();
  if (!lead) return null;
  const l = lead as Record<string, unknown> & { id: string; agency_name: string; status: LeadStatusT; priority: LeadPriorityT; assigned_to: string | null; imported_by: string | null; created_by: string | null };

  const [people, contactsRes, notesRes, actsRes, fupsRes] = await Promise.all([
    profileMap(),
    supabase.from('lead_contacts').select('id, name, position, email, phone, linkedin, is_primary').eq('lead_id', id).order('created_at'),
    supabase.from('lead_notes').select('id, body, created_at, author_id').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_activities').select('id, verb, meta, created_at, actor_id').eq('lead_id', id).order('created_at', { ascending: false }),
    supabase.from('lead_followups').select('id, type, due_date, note, done, assigned_to').eq('lead_id', id).order('due_date'),
  ]);

  const name = (uid: string | null) => (uid ? people.get(uid)?.full_name ?? null : null);
  return {
    lead: l,
    assigneeName: name(l.assigned_to),
    importedByName: name(l.imported_by),
    createdByName: name(l.created_by),
    contacts: (contactsRes.data ?? []) as LeadDetail['contacts'],
    notes: ((notesRes.data ?? []) as { id: string; body: string; created_at: string; author_id: string | null }[]).map((n) => ({
      id: n.id, body: n.body, created_at: n.created_at, authorName: name(n.author_id),
    })),
    activities: ((actsRes.data ?? []) as { id: string; verb: string; meta: unknown; created_at: string; actor_id: string | null }[]).map((a) => ({
      id: a.id, verb: a.verb, meta: a.meta, created_at: a.created_at, actorName: name(a.actor_id),
    })),
    followups: ((fupsRes.data ?? []) as { id: string; type: FollowupTypeT; due_date: string; note: string | null; done: boolean; assigned_to: string | null }[]).map((f) => ({
      id: f.id, type: f.type, due_date: f.due_date, note: f.note, done: f.done, assigneeName: name(f.assigned_to),
    })),
  };
}

// ───────────── dashboard ─────────────
export interface LeadDashboard {
  total: number;
  newThisWeek: number;
  newToday: number;
  assignedCount: number;
  followupsToday: number;
  followupsOverdue: number;
  followupsUpcoming: number;
  demoPipeline: number;
  wonThisMonth: number;
  lostThisMonth: number;
  byStatus: { status: LeadStatusT; count: number }[];
  byCountry: { country: string; count: number }[];
  todayFollowupList: { id: string; leadId: string; agency: string; type: FollowupTypeT; due_date: string; overdue: boolean }[];
  recent: { id: string; verb: string; created_at: string; actorName: string | null; agency: string | null }[];
}

export async function getLeadDashboard(): Promise<LeadDashboard> {
  const supabase = await createClient();
  const today = todayISO();
  const weekAgo = inDays(-7);
  const monthStart = today.slice(0, 8) + '01';

  const [leadsRes, fupsRes, people, actsRes] = await Promise.all([
    supabase.from('leads').select('id, agency_name, status, country, assigned_to, demo_date, customer_since, created_at').is('deleted_at', null),
    supabase.from('lead_followups').select('id, lead_id, type, due_date, done').eq('done', false),
    profileMap(),
    supabase.from('lead_activities').select('id, verb, created_at, actor_id, lead_id').order('created_at', { ascending: false }).limit(12),
  ]);

  const leads = (leadsRes.data ?? []) as { id: string; agency_name: string; status: LeadStatusT; country: string | null; assigned_to: string | null; demo_date: string | null; customer_since: string | null; created_at: string }[];
  const fups = (fupsRes.data ?? []) as { id: string; lead_id: string; type: FollowupTypeT; due_date: string; done: boolean }[];
  const agencyById = new Map(leads.map((l) => [l.id, l.agency_name]));

  const statusCounts = new Map<LeadStatusT, number>();
  const countryCounts = new Map<string, number>();
  let assignedCount = 0, wonThisMonth = 0, lostThisMonth = 0, demoPipeline = 0, newThisWeek = 0, newToday = 0;
  for (const l of leads) {
    statusCounts.set(l.status, (statusCounts.get(l.status) ?? 0) + 1);
    if (l.country) countryCounts.set(l.country, (countryCounts.get(l.country) ?? 0) + 1);
    if (l.assigned_to) assignedCount += 1;
    if (l.status === 'DEMO_SCHEDULED' || l.status === 'DEMO_COMPLETED') demoPipeline += 1;
    if (l.status === 'WON' && (l.customer_since ?? l.created_at.slice(0, 10)) >= monthStart) wonThisMonth += 1;
    if (l.status === 'LOST' && l.created_at.slice(0, 10) >= monthStart) lostThisMonth += 1;
    const created = l.created_at.slice(0, 10);
    if (created >= weekAgo) newThisWeek += 1;
    if (created === today) newToday += 1;
  }

  let followupsToday = 0, followupsOverdue = 0, followupsUpcoming = 0;
  const todayFollowupList: LeadDashboard['todayFollowupList'] = [];
  for (const f of fups) {
    if (f.due_date < today) { followupsOverdue += 1; }
    else if (f.due_date === today) { followupsToday += 1; }
    else { followupsUpcoming += 1; }
    if (f.due_date <= today) {
      todayFollowupList.push({ id: f.id, leadId: f.lead_id, agency: agencyById.get(f.lead_id) ?? '—', type: f.type, due_date: f.due_date, overdue: f.due_date < today });
    }
  }
  todayFollowupList.sort((a, b) => a.due_date.localeCompare(b.due_date));

  const byStatus = [...statusCounts.entries()].map(([status, count]) => ({ status, count }));
  const byCountry = [...countryCounts.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 8);

  const recent = ((actsRes.data ?? []) as { id: string; verb: string; created_at: string; actor_id: string | null; lead_id: string }[]).map((a) => ({
    id: a.id, verb: a.verb, created_at: a.created_at,
    actorName: a.actor_id ? people.get(a.actor_id)?.full_name ?? null : null,
    agency: agencyById.get(a.lead_id) ?? null,
  }));

  return {
    total: leads.length,
    newThisWeek, newToday, assignedCount,
    followupsToday, followupsOverdue, followupsUpcoming,
    demoPipeline, wonThisMonth, lostThisMonth,
    byStatus, byCountry, todayFollowupList: todayFollowupList.slice(0, 8), recent,
  };
}

// ───────────── reports ─────────────
export interface LeadReports {
  weekly: { leadsAdded: number; connectionsSent: number; emailsSent: number; replies: number; demos: number; customers: number };
  monthly: { conversionPct: number; pipelineOpen: number; topCountries: { country: string; count: number }[] };
}

export async function getLeadReports(): Promise<LeadReports> {
  const supabase = await createClient();
  const weekAgo = inDays(-7);
  const monthAgo = inDays(-30);

  const { data } = await supabase.from('leads')
    .select('status, country, created_at, li_requested_at, cold_email_sent_at, cold_email_replied_at, ig_replied_at, fb_replied_at, x_replied_at, demo_date, customer_since')
    .is('deleted_at', null);
  const leads = (data ?? []) as {
    status: LeadStatusT; country: string | null; created_at: string; li_requested_at: string | null;
    cold_email_sent_at: string | null; cold_email_replied_at: string | null; ig_replied_at: string | null;
    fb_replied_at: string | null; x_replied_at: string | null; demo_date: string | null; customer_since: string | null;
  }[];

  const after = (ts: string | null, cut: string) => !!ts && ts.slice(0, 10) >= cut;
  const weekly = {
    leadsAdded: leads.filter((l) => l.created_at.slice(0, 10) >= weekAgo).length,
    connectionsSent: leads.filter((l) => after(l.li_requested_at, weekAgo)).length,
    emailsSent: leads.filter((l) => after(l.cold_email_sent_at, weekAgo)).length,
    replies: leads.filter((l) => after(l.cold_email_replied_at, weekAgo) || after(l.ig_replied_at, weekAgo) || after(l.fb_replied_at, weekAgo) || after(l.x_replied_at, weekAgo)).length,
    demos: leads.filter((l) => after(l.demo_date ? l.demo_date + 'T00:00:00Z' : null, weekAgo)).length,
    customers: leads.filter((l) => l.status === 'WON' && after(l.customer_since ? l.customer_since + 'T00:00:00Z' : null, weekAgo)).length,
  };

  const monthLeads = leads.filter((l) => l.created_at.slice(0, 10) >= monthAgo);
  const won = monthLeads.filter((l) => l.status === 'WON').length;
  const countryCounts = new Map<string, number>();
  for (const l of leads) if (l.country) countryCounts.set(l.country, (countryCounts.get(l.country) ?? 0) + 1);
  const monthly = {
    conversionPct: monthLeads.length ? Math.round((won / monthLeads.length) * 100) : 0,
    pipelineOpen: leads.filter((l) => OPEN_STATUSES.includes(l.status)).length,
    topCountries: [...countryCounts.entries()].map(([country, count]) => ({ country, count })).sort((a, b) => b.count - a.count).slice(0, 6),
  };
  return { weekly, monthly };
}

/** Distinct filter values for the list toolbar (countries, industries, tags). */
export async function getLeadFilterOptions(): Promise<{ countries: string[]; industries: string[]; tags: string[] }> {
  const supabase = await createClient();
  const { data } = await supabase.from('leads').select('country, industry, tags').is('deleted_at', null);
  const rows = (data ?? []) as { country: string | null; industry: string | null; tags: string[] }[];
  const countries = new Set<string>(), industries = new Set<string>(), tags = new Set<string>();
  for (const r of rows) {
    if (r.country) countries.add(r.country);
    if (r.industry) industries.add(r.industry);
    for (const t of r.tags ?? []) tags.add(t);
  }
  return {
    countries: [...countries].sort(),
    industries: [...industries].sort(),
    tags: [...tags].sort(),
  };
}
