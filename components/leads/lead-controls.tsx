'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { setLeadStatus, assignLead, deleteLead } from '@/lib/actions/leads';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/leads/badges';
import { STATUS_ORDER, STATUS_META } from '@/lib/leads/constants';
import type { LeadStatus as LeadStatusT } from '@/types/enums';

export function StatusControl({ leadId, status }: { leadId: string; status: LeadStatusT }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const move = (to: LeadStatusT) =>
    start(async () => {
      const res = await setLeadStatus(leadId, to);
      if (res.ok) { toast.success(`Moved to ${STATUS_META[to].label}`); router.refresh(); }
      else toast.error(res.error);
    });
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2"><span className="text-caption text-text-muted">Status</span><StatusBadge status={status} /></div>
      <Select value={status} disabled={pending} onChange={(e) => move(e.target.value as LeadStatusT)}>
        {STATUS_ORDER.map((s) => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
      </Select>
    </div>
  );
}

export function AssigneeControl({ leadId, assignedTo, people }: { leadId: string; assignedTo: string | null; people: { id: string; full_name: string }[] }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const change = (val: string) =>
    start(async () => {
      const res = await assignLead(leadId, val || null);
      if (res.ok) { toast.success(val ? 'Lead assigned' : 'Unassigned'); router.refresh(); }
      else toast.error(res.error);
    });
  return (
    <div className="space-y-2">
      <span className="text-caption text-text-muted">Assigned to</span>
      <Select value={assignedTo ?? ''} disabled={pending} onChange={(e) => change(e.target.value)}>
        <option value="">Unassigned</option>
        {people.map((p) => <option key={p.id} value={p.id}>{p.full_name}</option>)}
      </Select>
    </div>
  );
}

export function DeleteLeadButton({ leadId }: { leadId: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  const onDelete = () => {
    if (!confirm('Delete this lead? This can be restored by an admin.')) return;
    start(async () => {
      const res = await deleteLead(leadId);
      if (res.ok) { toast.success('Lead deleted'); router.push('/leads'); router.refresh(); }
      else toast.error(res.error);
    });
  };
  return (
    <Button variant="danger" size="sm" disabled={pending} onClick={onDelete}><Trash2 className="h-3.5 w-3.5" /> Delete</Button>
  );
}
