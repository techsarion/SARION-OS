import { Badge } from '@/components/ui/badge';
import { STATUS_META, PRIORITY_META } from '@/lib/tasks/constants';
import type { TaskStatus as TaskStatusT, Priority as PriorityT } from '@/types/enums';

export function StatusBadge({ status }: { status: TaskStatusT }) {
  const m = STATUS_META[status];
  return <Badge tone={m.tone} dot>{m.label}</Badge>;
}

export function PriorityBadge({ priority }: { priority: PriorityT }) {
  const m = PRIORITY_META[priority];
  return <Badge tone={m.tone}>{priority}</Badge>;
}
