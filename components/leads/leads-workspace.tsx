'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  Search, Mail, Linkedin, Globe, Copy, CalendarPlus, ChevronDown, X, Users2, Tag as TagIcon,
  Archive, Trash2, ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Avatar } from '@/components/ui/misc';
import { EmptyState } from '@/components/ui/states';
import { StatusBadge, PriorityBadge } from '@/components/leads/badges';
import { STATUS_ORDER, STATUS_META, PRIORITY_ORDER, PRIORITY_META, FOLLOWUP_ORDER, FOLLOWUP_META } from '@/lib/leads/constants';
import { ensureUrl } from '@/lib/leads/format';
import { bulkLeadAction } from '@/lib/actions/leads';
import type { LeadListItem } from '@/lib/server/data/leads';
import type { LeadStatus as LeadStatusT, FollowupType as FollowupTypeT } from '@/types/enums';

interface Props {
  leads: LeadListItem[];
  people: { id: string; full_name: string }[];
  options: { countries: string[]; industries: string[]; tags: string[] };
  canAssign: boolean;
  canDelete: boolean;
}

export function LeadsWorkspace({ leads, people, options, canAssign, canDelete }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');
  const [country, setCountry] = useState('');
  const [industry, setIndustry] = useState('');
  const [assignee, setAssignee] = useState('');
  const [priority, setPriority] = useState('');
  const [tag, setTag] = useState('');
  const [demo, setDemo] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return leads.filter((l) => {
      if (needle) {
        const hay = `${l.agency_name} ${l.country ?? ''} ${l.industry ?? ''} ${l.business_email ?? ''} ${l.contact_person ?? ''} ${(l.tags ?? []).join(' ')}`.toLowerCase();
        if (!hay.includes(needle)) return false;
      }
      if (status && l.status !== status) return false;
      if (country && l.country !== country) return false;
      if (industry && l.industry !== industry) return false;
      if (assignee && l.assignedTo !== (assignee === 'none' ? null : assignee)) return false;
      if (priority && l.priority !== priority) return false;
      if (tag && !(l.tags ?? []).includes(tag)) return false;
      if (demo === 'scheduled' && l.status !== 'DEMO_SCHEDULED') return false;
      if (demo === 'completed' && l.status !== 'DEMO_COMPLETED') return false;
      if (demo === 'none' && (l.status === 'DEMO_SCHEDULED' || l.status === 'DEMO_COMPLETED')) return false;
      return true;
    });
  }, [leads, q, status, country, industry, assignee, priority, tag, demo]);

  const activeFilters = [status, country, industry, assignee, priority, tag, demo].filter(Boolean).length + (q ? 1 : 0);
  const clearAll = () => { setQ(''); setStatus(''); setCountry(''); setIndustry(''); setAssignee(''); setPriority(''); setTag(''); setDemo(''); };

  const allVisibleSelected = filtered.length > 0 && filtered.every((l) => selected.has(l.id));
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) filtered.forEach((l) => next.delete(l.id));
      else filtered.forEach((l) => next.add(l.id));
      return next;
    });
  };
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev); next.has(id) ? next.delete(id) : next.add(id); return next;
  });

  const runBulk = (action: Parameters<typeof bulkLeadAction>[1], label: string) =>
    start(async () => {
      const res = await bulkLeadAction([...selected], action);
      if (res.ok) { toast.success(`${label} · ${res.count} lead${res.count === 1 ? '' : 's'}`); setSelected(new Set()); router.refresh(); }
      else toast.error(res.error);
    });

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex flex-col gap-2.5">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search agencies, contacts, emails, tags…" className="pl-9" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Filter value={status} onChange={setStatus} label="Status" options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))} />
          <Filter value={priority} onChange={setPriority} label="Priority" options={PRIORITY_ORDER.map((p) => ({ value: p, label: PRIORITY_META[p].label }))} />
          <Filter value={assignee} onChange={setAssignee} label="Assigned" options={[{ value: 'none', label: 'Unassigned' }, ...people.map((p) => ({ value: p.id, label: p.full_name }))]} />
          <Filter value={country} onChange={setCountry} label="Country" options={options.countries.map((c) => ({ value: c, label: c }))} />
          <Filter value={industry} onChange={setIndustry} label="Industry" options={options.industries.map((c) => ({ value: c, label: c }))} />
          {options.tags.length > 0 && <Filter value={tag} onChange={setTag} label="Tag" options={options.tags.map((t) => ({ value: t, label: t }))} />}
          <Filter value={demo} onChange={setDemo} label="Demo" options={[{ value: 'scheduled', label: 'Scheduled' }, { value: 'completed', label: 'Completed' }, { value: 'none', label: 'No demo' }]} />
          {activeFilters > 0 && (
            <Button variant="ghost" size="sm" onClick={clearAll}><X className="h-3.5 w-3.5" /> Clear ({activeFilters})</Button>
          )}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-sm border border-accent/40 bg-accent-soft px-3 py-2">
          <span className="text-body-sm font-medium text-text">{selected.size} selected</span>
          <div className="ml-auto flex flex-wrap items-center gap-1.5">
            {canAssign && (
              <InlineSelect placeholder="Assign…" icon={<Users2 className="h-3.5 w-3.5" />} disabled={pending}
                options={[{ value: 'none', label: 'Unassign' }, ...people.map((p) => ({ value: p.id, label: p.full_name }))]}
                onPick={(val) => runBulk({ kind: 'assign', assigneeId: val === 'none' ? null : val }, 'Assigned')} />
            )}
            <InlineSelect placeholder="Status…" disabled={pending}
              options={STATUS_ORDER.map((s) => ({ value: s, label: STATUS_META[s].label }))}
              onPick={(val) => runBulk({ kind: 'status', status: val as LeadStatusT }, 'Status updated')} />
            <InlineSelect placeholder="Follow-up…" icon={<CalendarPlus className="h-3.5 w-3.5" />} disabled={pending}
              options={FOLLOWUP_ORDER.map((f) => ({ value: f, label: FOLLOWUP_META[f].label }))}
              onPick={(val) => {
                const due = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
                runBulk({ kind: 'followup', due_date: due, ftype: val as FollowupTypeT }, 'Follow-up in 3 days');
              }} />
            <BulkTag disabled={pending} onTag={(t) => runBulk({ kind: 'tag', tag: t }, 'Tagged')} />
            <Button size="sm" variant="secondary" disabled={pending} onClick={() => runBulk({ kind: 'archive' }, 'Archived')}><Archive className="h-3.5 w-3.5" /> Archive</Button>
            {canDelete && (
              <Button size="sm" variant="danger" disabled={pending}
                onClick={() => { if (confirm(`Delete ${selected.size} lead(s)?`)) runBulk({ kind: 'delete' }, 'Deleted'); }}>
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            )}
            <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Cancel</Button>
          </div>
        </div>
      )}

      <p className="text-caption text-text-muted">{filtered.length} of {leads.length} leads</p>

      {filtered.length === 0 ? (
        <EmptyState icon={Search} title="No leads match" description="Try clearing filters or importing a fresh CSV of researched agencies." />
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-hidden rounded-sm border border-border md:block">
            <table className="w-full text-body-sm">
              <thead className="bg-surface-2 text-caption text-text-muted">
                <tr>
                  <th className="w-9 px-3 py-2"><input type="checkbox" checked={allVisibleSelected} onChange={toggleAll} aria-label="Select all" /></th>
                  <th className="px-3 py-2 text-left font-medium">Agency</th>
                  <th className="px-3 py-2 text-left font-medium">Status</th>
                  <th className="px-3 py-2 text-left font-medium">Priority</th>
                  <th className="px-3 py-2 text-left font-medium">Assigned</th>
                  <th className="px-3 py-2 text-left font-medium">Country</th>
                  <th className="px-3 py-2 text-left font-medium">Next Follow-up</th>
                  <th className="px-3 py-2 text-right font-medium">Quick actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((l) => (
                  <tr key={l.id} className="group hover:bg-white/[0.02]">
                    <td className="px-3 py-2.5"><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.agency_name}`} /></td>
                    <td className="px-3 py-2.5">
                      <Link href={`/leads/${l.id}`} className="font-medium text-text hover:text-accent">{l.agency_name}</Link>
                      <div className="text-caption text-text-muted">{l.industry ?? l.contact_person ?? l.business_email ?? '—'}</div>
                    </td>
                    <td className="px-3 py-2.5"><StatusBadge status={l.status} short /></td>
                    <td className="px-3 py-2.5"><PriorityBadge priority={l.priority} /></td>
                    <td className="px-3 py-2.5">
                      {l.assigneeName ? (
                        <span className="inline-flex items-center gap-1.5"><Avatar name={l.assigneeName} src={l.assigneeAvatar} size={20} /><span className="text-text-secondary">{l.assigneeName}</span></span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-text-secondary">{l.country ?? '—'}</td>
                    <td className="px-3 py-2.5">
                      {l.next_followup ? (
                        <span className={l.isFollowupOverdue ? 'text-danger' : 'text-text-secondary'}>{l.next_followup}</span>
                      ) : <span className="text-text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <QuickActions lead={l} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((l) => (
              <div key={l.id} className="rounded-sm border border-border bg-card p-3">
                <div className="flex items-start gap-2.5">
                  <input type="checkbox" className="mt-1" checked={selected.has(l.id)} onChange={() => toggle(l.id)} aria-label={`Select ${l.agency_name}`} />
                  <div className="min-w-0 flex-1">
                    <Link href={`/leads/${l.id}`} className="block truncate font-medium text-text">{l.agency_name}</Link>
                    <div className="truncate text-caption text-text-muted">{[l.industry, l.country].filter(Boolean).join(' · ') || '—'}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      <StatusBadge status={l.status} short />
                      <PriorityBadge priority={l.priority} />
                      {l.assigneeName && <span className="text-caption text-text-muted">· {l.assigneeName}</span>}
                    </div>
                    {l.next_followup && (
                      <div className={`mt-1.5 text-caption ${l.isFollowupOverdue ? 'text-danger' : 'text-text-muted'}`}>Follow-up {l.next_followup}</div>
                    )}
                  </div>
                </div>
                <div className="mt-2.5 border-t border-border pt-2.5"><QuickActions lead={l} /></div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ───────────── quick actions ─────────────
function QuickActions({ lead }: { lead: LeadListItem }) {
  const email = lead.business_email;
  const li = ensureUrl(lead.founder_linkedin || lead.linkedin_company);
  const site = ensureUrl(lead.website);
  const copy = (text: string, label: string) => { navigator.clipboard.writeText(text).then(() => toast.success(`${label} copied`)).catch(() => toast.error('Copy failed')); };

  return (
    <div className="flex items-center justify-end gap-0.5">
      {email && <IconBtn title="Send email" onClick={() => { window.location.href = `mailto:${email}`; }}><Mail className="h-4 w-4" /></IconBtn>}
      {email && <IconBtn title="Copy email" onClick={() => copy(email, 'Email')}><Copy className="h-4 w-4" /></IconBtn>}
      {li && <IconBtn title="Open LinkedIn" onClick={() => window.open(li, '_blank')}><Linkedin className="h-4 w-4" /></IconBtn>}
      {site && <IconBtn title="Open website" onClick={() => window.open(site, '_blank')}><Globe className="h-4 w-4" /></IconBtn>}
      <Link href={`/leads/${lead.id}`} title="Open lead" className="grid h-7 w-7 place-items-center rounded-sm text-text-muted hover:bg-white/[0.06] hover:text-text"><ExternalLink className="h-4 w-4" /></Link>
    </div>
  );
}

function IconBtn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" title={title} onClick={onClick} className="grid h-7 w-7 place-items-center rounded-sm text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text">
      {children}
    </button>
  );
}

// ───────────── filter dropdown ─────────────
function Filter({ value, onChange, label, options }: { value: string; onChange: (v: string) => void; label: string; options: { value: string; label: string }[] }) {
  return (
    <div className="relative">
      <Select value={value} onChange={(e) => onChange(e.target.value)} className={`h-8 w-auto pr-8 text-caption ${value ? 'border-accent/60 text-text' : 'text-text-secondary'}`}>
        <option value="">{label}: All</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </Select>
    </div>
  );
}

function InlineSelect({ placeholder, icon, options, onPick, disabled }: { placeholder: string; icon?: React.ReactNode; options: { value: string; label: string }[]; onPick: (v: string) => void; disabled?: boolean }) {
  return (
    <div className="relative inline-flex items-center">
      {icon && <span className="pointer-events-none absolute left-2 text-text-muted">{icon}</span>}
      <select
        disabled={disabled}
        defaultValue=""
        onChange={(e) => { if (e.target.value) { onPick(e.target.value); e.target.value = ''; } }}
        className={`h-7 rounded-sm border border-border-strong bg-card text-caption text-text ${icon ? 'pl-7' : 'pl-2'} pr-6`}
      >
        <option value="" disabled>{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      <ChevronDown className="pointer-events-none absolute right-1.5 h-3 w-3 text-text-muted" />
    </div>
  );
}

function BulkTag({ onTag, disabled }: { onTag: (t: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState('');
  if (!open) return <Button size="sm" variant="secondary" disabled={disabled} onClick={() => setOpen(true)}><TagIcon className="h-3.5 w-3.5" /> Tag</Button>;
  return (
    <span className="inline-flex items-center gap-1">
      <Input autoFocus value={val} onChange={(e) => setVal(e.target.value)} placeholder="tag" className="h-7 w-24 text-caption"
        onKeyDown={(e) => { if (e.key === 'Enter' && val.trim()) { onTag(val.trim()); setVal(''); setOpen(false); } if (e.key === 'Escape') setOpen(false); }} />
      <Button size="sm" variant="secondary" disabled={disabled || !val.trim()} onClick={() => { onTag(val.trim()); setVal(''); setOpen(false); }}>Add</Button>
    </span>
  );
}
