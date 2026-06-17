// Task status workflow + priority metadata. Pure constants — safe to import in
// both Server Actions and Client Components.
import { TaskStatus, Priority } from '@/types/enums';
import type { TaskStatus as TaskStatusT, Priority as PriorityT } from '@/types/enums';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const STATUS_ORDER: TaskStatusT[] = [
  TaskStatus.DRAFT, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.APPROVED, TaskStatus.COMPLETED,
];

export const STATUS_META: Record<TaskStatusT, { label: string; tone: Tone }> = {
  DRAFT: { label: 'Draft', tone: 'neutral' },
  ASSIGNED: { label: 'Assigned', tone: 'info' },
  IN_PROGRESS: { label: 'In progress', tone: 'accent' },
  REVIEW: { label: 'In review', tone: 'warning' },
  APPROVED: { label: 'Approved', tone: 'success' },
  COMPLETED: { label: 'Completed', tone: 'success' },
};

/** Allowed forward/backward transitions. Keeps the workflow disciplined while
 *  still letting work bounce back from review. */
export const ALLOWED_TRANSITIONS: Record<TaskStatusT, TaskStatusT[]> = {
  DRAFT: [TaskStatus.ASSIGNED],
  ASSIGNED: [TaskStatus.IN_PROGRESS, TaskStatus.DRAFT],
  IN_PROGRESS: [TaskStatus.REVIEW, TaskStatus.ASSIGNED],
  REVIEW: [TaskStatus.APPROVED, TaskStatus.IN_PROGRESS],
  APPROVED: [TaskStatus.COMPLETED, TaskStatus.REVIEW],
  COMPLETED: [TaskStatus.IN_PROGRESS],
};

export function canTransition(from: TaskStatusT, to: TaskStatusT): boolean {
  return ALLOWED_TRANSITIONS[from]?.includes(to) ?? false;
}

export const PRIORITY_ORDER: PriorityT[] = [Priority.P0, Priority.P1, Priority.P2, Priority.P3];

export const PRIORITY_META: Record<PriorityT, { label: string; tone: Tone }> = {
  P0: { label: 'P0 · Critical', tone: 'danger' },
  P1: { label: 'P1 · High', tone: 'warning' },
  P2: { label: 'P2 · Medium', tone: 'accent' },
  P3: { label: 'P3 · Low', tone: 'neutral' },
};

export const OPEN_STATUSES: TaskStatusT[] = [
  TaskStatus.DRAFT, TaskStatus.ASSIGNED, TaskStatus.IN_PROGRESS, TaskStatus.REVIEW, TaskStatus.APPROVED,
];
