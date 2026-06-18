// Domain enums — mirror the Supabase schema (supabase/migrations). Single source for the app.

export const Role = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  MANAGING_DIRECTOR: 'MANAGING_DIRECTOR',
  DEPARTMENT_HEAD: 'DEPARTMENT_HEAD',
  TEAM_LEAD: 'TEAM_LEAD',
  MARKETING_OFFICER: 'MARKETING_OFFICER',
  EMPLOYEE: 'EMPLOYEE',
  GUEST: 'GUEST',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const EmploymentStatus = {
  ACTIVE: 'ACTIVE',
  ON_LEAVE: 'ON_LEAVE',
  RESIGNED: 'RESIGNED',
  TERMINATED: 'TERMINATED',
} as const;
export type EmploymentStatus = (typeof EmploymentStatus)[keyof typeof EmploymentStatus];

export const TaskStatus = {
  DRAFT: 'DRAFT',
  ASSIGNED: 'ASSIGNED',
  IN_PROGRESS: 'IN_PROGRESS',
  REVIEW: 'REVIEW',
  APPROVED: 'APPROVED',
  COMPLETED: 'COMPLETED',
} as const;
export type TaskStatus = (typeof TaskStatus)[keyof typeof TaskStatus];

export const Priority = { P0: 'P0', P1: 'P1', P2: 'P2', P3: 'P3' } as const;
export type Priority = (typeof Priority)[keyof typeof Priority];

export const TargetPeriod = { DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY' } as const;
export type TargetPeriod = (typeof TargetPeriod)[keyof typeof TargetPeriod];

export const TargetScope = { PERSONAL: 'PERSONAL', TEAM: 'TEAM' } as const;
export type TargetScope = (typeof TargetScope)[keyof typeof TargetScope];

export const TargetStatus = {
  NOT_STARTED: 'NOT_STARTED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
} as const;
export type TargetStatus = (typeof TargetStatus)[keyof typeof TargetStatus];

export const MeetingRecurrence = { NONE: 'NONE', DAILY: 'DAILY', WEEKLY: 'WEEKLY', MONTHLY: 'MONTHLY' } as const;
export type MeetingRecurrence = (typeof MeetingRecurrence)[keyof typeof MeetingRecurrence];

export const CheckinKind = { MORNING: 'MORNING', EOD: 'EOD' } as const;
export type CheckinKind = (typeof CheckinKind)[keyof typeof CheckinKind];

export const MeetingType = {
  STANDUP: 'STANDUP',
  WEEKLY_REVIEW: 'WEEKLY_REVIEW',
  MONTHLY_REVIEW: 'MONTHLY_REVIEW',
  STRATEGY: 'STRATEGY',
} as const;
export type MeetingType = (typeof MeetingType)[keyof typeof MeetingType];
