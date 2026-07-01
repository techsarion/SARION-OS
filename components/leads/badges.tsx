import { Badge } from '@/components/ui/badge';
import { STATUS_META, PRIORITY_META } from '@/lib/leads/constants';
import type { LeadStatus as LeadStatusT, LeadPriority as LeadPriorityT } from '@/types/enums';

export function StatusBadge({ status, short = false }: { status: LeadStatusT; short?: boolean }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone} dot>{short ? m.short : m.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: LeadPriorityT }) {
  const m = PRIORITY_META[priority];
  return <Badge tone={m.tone}>{m.label}</Badge>;
}
