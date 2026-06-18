// Meeting type + status metadata. Pure constants — safe in Server and Client.
import { MeetingType } from '@/types/enums';
import type { MeetingType as MeetingTypeT } from '@/types/enums';

type Tone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info';

export const MEETING_TYPE_ORDER: MeetingTypeT[] = [
  MeetingType.STANDUP, MeetingType.WEEKLY_REVIEW, MeetingType.MONTHLY_REVIEW, MeetingType.STRATEGY,
];

export const MEETING_TYPE_META: Record<MeetingTypeT, { label: string; tone: Tone }> = {
  STANDUP: { label: 'Daily Standup', tone: 'accent' },
  WEEKLY_REVIEW: { label: 'Weekly Review', tone: 'info' },
  MONTHLY_REVIEW: { label: 'Monthly Review', tone: 'warning' },
  STRATEGY: { label: 'Strategy Meeting', tone: 'success' },
};
