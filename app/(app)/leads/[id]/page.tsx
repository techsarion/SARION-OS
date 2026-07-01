import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Pencil, Globe, Mail, Phone, Linkedin, Instagram, Facebook, Twitter, Building2, User,
  MapPin, Briefcase, Calendar, ExternalLink,
} from 'lucide-react';
import { requirePermission } from '@/lib/auth';
import { can } from '@/lib/rbac';
import { getLeadDetail, getTeamProfiles } from '@/lib/server/data/leads';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { buttonVariants } from '@/components/ui/button';
import { PriorityBadge } from '@/components/leads/badges';
import { StatusControl, AssigneeControl, DeleteLeadButton } from '@/components/leads/lead-controls';
import { LeadNotes } from '@/components/leads/lead-notes';
import { LeadFollowups } from '@/components/leads/lead-followups';
import { LeadOutreach } from '@/components/leads/lead-outreach';
import { LeadContacts } from '@/components/leads/lead-contacts';
import { LeadTimeline } from '@/components/leads/lead-timeline';
import { ensureUrl } from '@/lib/leads/format';
import type { LeadStatus as LeadStatusT, LeadPriority as LeadPriorityT } from '@/types/enums';

export const metadata = { title: 'Lead — Sarion Team OS' };

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requirePermission('lead:read');
  const { id } = await params;
  const [detail, people] = await Promise.all([getLeadDetail(id), getTeamProfiles()]);
  if (!detail) notFound();

  const l = detail.lead as Record<string, string | null> & { id: string; agency_name: string; status: LeadStatusT; priority: LeadPriorityT; tags: string[] };
  const site = ensureUrl(l.website);
  const li = ensureUrl(l.linkedin_company);
  const founderLi = ensureUrl(l.founder_linkedin);
  const canEdit = can(user.role, 'lead:update');

  return (
    <div className="mx-auto max-w-[1200px] fade-up">
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="mb-1 flex items-center gap-2 text-caption text-text-muted">
            <Link href="/leads" className="hover:text-text">Leads</Link><span>/</span><span>{l.agency_name}</span>
          </div>
          <h1 className="text-h1">{l.agency_name}</h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-body-sm text-text-secondary">
            {l.industry && <span className="inline-flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" />{l.industry}</span>}
            {(l.city || l.country) && <span className="inline-flex items-center gap-1"><MapPin className="h-3.5 w-3.5" />{[l.city, l.country].filter(Boolean).join(', ')}</span>}
            {l.agency_size && <span className="inline-flex items-center gap-1"><User className="h-3.5 w-3.5" />{l.agency_size}</span>}
          </div>
          {l.tags?.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {l.tags.map((t) => <Badge key={t} tone="outline">{t}</Badge>)}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {canEdit && <Link href={`/leads/${id}/edit`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}><Pencil className="h-3.5 w-3.5" /> Edit</Link>}
          {can(user.role, 'lead:delete') && <DeleteLeadButton leadId={id} />}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Main column */}
        <div className="space-y-4 lg:col-span-2">
          {/* Quick contact bar */}
          <Card>
            <CardContent className="flex flex-wrap gap-2">
              {l.business_email && <QuickLink href={`mailto:${l.business_email}`} icon={Mail} label="Email" />}
              {site && <QuickLink href={site} icon={Globe} label="Website" external />}
              {founderLi && <QuickLink href={founderLi} icon={Linkedin} label="Founder LinkedIn" external />}
              {li && <QuickLink href={li} icon={Building2} label="Company LinkedIn" external />}
              {ensureUrl(l.instagram) && <QuickLink href={ensureUrl(l.instagram)!} icon={Instagram} label="Instagram" external />}
              {ensureUrl(l.facebook) && <QuickLink href={ensureUrl(l.facebook)!} icon={Facebook} label="Facebook" external />}
              {ensureUrl(l.x_handle) && <QuickLink href={ensureUrl(l.x_handle)!} icon={Twitter} label="X" external />}
              {l.phone && <QuickLink href={`tel:${l.phone}`} icon={Phone} label={l.phone} />}
            </CardContent>
          </Card>

          <Section title="Outreach Tracking">
            <LeadOutreach leadId={id} lead={detail.lead} />
          </Section>

          <Section title="Timeline">
            <LeadTimeline activities={detail.activities} />
          </Section>

          <Section title="Notes">
            <LeadNotes leadId={id} notes={detail.notes} />
          </Section>

          <Section title="Follow-ups">
            <LeadFollowups leadId={id} followups={detail.followups} people={people} />
          </Section>

          <Section title="Additional Contacts">
            <LeadContacts leadId={id} contacts={detail.contacts} />
          </Section>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card>
            <CardContent className="space-y-4">
              <StatusControl leadId={id} status={l.status} />
              <div className="flex items-center gap-2"><span className="text-caption text-text-muted">Priority</span><PriorityBadge priority={l.priority} /></div>
              {canEdit ? <AssigneeControl leadId={id} assignedTo={l.assigned_to} people={people} /> : (
                <div><span className="text-caption text-text-muted">Assigned to</span><p className="text-body-sm text-text">{detail.assigneeName ?? 'Unassigned'}</p></div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Company</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <Row label="Founder" value={l.founder_name} />
              <Row label="Contact" value={l.contact_person} />
              <Row label="Position" value={l.position} />
              <Row label="Services" value={l.services} />
              <Row label="Research Source" value={l.research_source} />
              <Row label="Imported by" value={detail.importedByName} />
              <Row label="Created by" value={detail.createdByName} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Key Dates</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              <DateRow label="Last contact" value={l.last_contact_date} />
              <DateRow label="Next follow-up" value={l.next_followup} highlight />
              <DateRow label="Demo date" value={l.demo_date} />
              <DateRow label="Customer since" value={l.customer_since} />
              <DateRow label="Created" value={l.created_at?.slice(0, 10)} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader><CardTitle>{title}</CardTitle></CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function QuickLink({ href, icon: Icon, label, external }: { href: string; icon: typeof Mail; label: string; external?: boolean }) {
  return (
    <a href={href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}
      className="inline-flex items-center gap-1.5 rounded-sm border border-border-strong bg-surface px-2.5 py-1.5 text-caption text-text-secondary transition-colors hover:border-accent/50 hover:text-text">
      <Icon className="h-3.5 w-3.5" /> {label}{external && <ExternalLink className="h-3 w-3 opacity-60" />}
    </a>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-caption text-text-muted">{label}</span>
      <span className="text-right text-body-sm text-text">{value || '—'}</span>
    </div>
  );
}

function DateRow({ label, value, highlight }: { label: string; value: string | null | undefined; highlight?: boolean }) {
  const today = new Date().toISOString().slice(0, 10);
  const overdue = highlight && value && value < today;
  return (
    <div className="flex items-baseline justify-between gap-3">
      <span className="shrink-0 text-caption text-text-muted">{label}</span>
      <span className={`inline-flex items-center gap-1 text-body-sm ${overdue ? 'text-danger' : 'text-text'}`}>
        {value && highlight && <Calendar className="h-3 w-3" />}{value || '—'}
      </span>
    </div>
  );
}
