// Daily Execution Workspace — pure constants (safe on server + client).
import { DailyTaskState, DailyTaskSource } from '@/types/enums';
import type { DailyTaskState as StateT, DailyTaskSource as SourceT } from '@/types/enums';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const STATE_ORDER: StateT[] = [
  DailyTaskState.NOT_STARTED,
  DailyTaskState.IN_PROGRESS,
  DailyTaskState.BLOCKED,
  DailyTaskState.COMPLETED,
  DailyTaskState.CANCELLED,
];

export const STATE_META: Record<StateT, { label: string; tone: Tone; icon: string }> = {
  NOT_STARTED: { label: 'Not started', tone: 'neutral', icon: 'circle' },
  IN_PROGRESS: { label: 'In progress', tone: 'info', icon: 'circle-dot' },
  BLOCKED: { label: 'Blocked', tone: 'danger', icon: 'ban' },
  COMPLETED: { label: 'Completed', tone: 'success', icon: 'check-circle-2' },
  CANCELLED: { label: 'Cancelled', tone: 'neutral', icon: 'x-circle' },
};

// The cycle a plain checkbox / status pill walks through when tapped.
export const NEXT_STATE: Record<StateT, StateT> = {
  NOT_STARTED: DailyTaskState.IN_PROGRESS,
  IN_PROGRESS: DailyTaskState.COMPLETED,
  BLOCKED: DailyTaskState.IN_PROGRESS,
  COMPLETED: DailyTaskState.NOT_STARTED,
  CANCELLED: DailyTaskState.NOT_STARTED,
};

export const isDone = (s: StateT) => s === DailyTaskState.COMPLETED || s === DailyTaskState.CANCELLED;

// Which sources are auto-surfaced (read-only mirrors) vs. real editable rows.
export const SOURCE_META: Record<SourceT, { label: string; auto: boolean }> = {
  MANUAL: { label: 'Added by you', auto: false },
  CARRYOVER: { label: 'Carried over', auto: false },
  TASK: { label: 'Task due today', auto: true },
  LEAD_FOLLOWUP: { label: 'Lead follow-up', auto: true },
  MEETING_ACTION: { label: 'Meeting action', auto: true },
  TARGET: { label: 'Daily target', auto: true },
  RECURRING: { label: 'Recurring', auto: true },
};

// Priority (reuses the P0–P3 scale from the tasks module).
export const PRIORITY_ORDER = ['P0', 'P1', 'P2', 'P3'] as const;
export const PRIORITY_META: Record<string, { label: string; tone: Tone }> = {
  P0: { label: 'P0', tone: 'danger' },
  P1: { label: 'P1', tone: 'warning' },
  P2: { label: 'P2', tone: 'info' },
  P3: { label: 'P3', tone: 'neutral' },
};

// Quick category chips offered in the add-task form.
export const CATEGORIES = ['Outreach', 'Research', 'Design', 'Meetings', 'Admin', 'Content', 'Sales'] as const;

export const MAX_PRIORITIES = 3;
