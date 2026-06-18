// Target status + period metadata. Pure constants — safe in Server and Client.
import { TargetStatus, TargetPeriod } from '@/types/enums';
import type { TargetStatus as TargetStatusT, TargetPeriod as TargetPeriodT } from '@/types/enums';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const TARGET_STATUS_ORDER: TargetStatusT[] = [
  TargetStatus.NOT_STARTED, TargetStatus.IN_PROGRESS, TargetStatus.COMPLETED,
];

export const TARGET_STATUS_META: Record<TargetStatusT, { label: string; tone: Tone }> = {
  NOT_STARTED: { label: 'Not Started', tone: 'neutral' },
  IN_PROGRESS: { label: 'In Progress', tone: 'accent' },
  COMPLETED: { label: 'Completed', tone: 'success' },
};

export const PERIOD_META: Record<TargetPeriodT, { label: string; noun: string; dateLabel: string }> = {
  DAILY: { label: 'Daily Targets', noun: 'daily target', dateLabel: 'For' },
  WEEKLY: { label: 'Weekly Targets', noun: 'weekly target', dateLabel: 'Due date' },
  MONTHLY: { label: 'Monthly Targets', noun: 'monthly target', dateLabel: 'Target date' },
};

/** Quick-set progress steps used by weekly/monthly/team targets. */
export const PROGRESS_STEPS = [0, 25, 50, 75, 100] as const;

/** Derive a status from a progress value (keeps the two in sync). */
export function statusFromProgress(progress: number): TargetStatusT {
  if (progress >= 100) return TargetStatus.COMPLETED;
  if (progress > 0) return TargetStatus.IN_PROGRESS;
  return TargetStatus.NOT_STARTED;
}
