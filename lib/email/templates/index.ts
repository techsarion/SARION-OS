/**
 * Template registry — maps each EmailKind to its typed payload and builder.
 * This is what makes `sendEmail("teamInvite", to, {...})` fully type-safe: the
 * payload shape is checked against the template at the call site.
 *
 * Sarion Team OS sends 8 internal-only emails (no billing / sales / marketing).
 */
import type { EmailContent } from "../design";
import type { EmailKind } from "../senders";
import * as account from "./account";
import * as work from "./work";

export interface EmailPayloads {
  // People / relationship (team@)
  teamInvite: { inviteeName: string; inviterName: string; role: string; department?: string; inviteUrl: string; expiryDays: number };
  accountCreated: { name: string; email: string; role: string; tempPassword?: string; loginUrl?: string };
  teamAnnouncement: { title: string; body: string; authorName: string; ctaLabel?: string; ctaUrl?: string };
  // System / transactional (no-reply@)
  passwordReset: { resetUrl: string; name?: string };
  meetingInvitation: { inviteeName: string; title: string; dateTime: string; durationMin?: number; organizer: string; location?: string; meetingUrl?: string; agenda?: string };
  taskAssignment: { assigneeName: string; taskTitle: string; assignedBy: string; priority: string; dueDate?: string; project?: string; taskUrl: string };
  taskCompleted: { recipientName: string; taskTitle: string; completedBy: string; project?: string; taskUrl: string };
  taskOverdue: { assigneeName: string; taskTitle: string; dueDate: string; priority: string; taskUrl: string };
  approvalRequest: { approverName: string; requestType: string; requestedBy: string; summary: string; amount?: string; approvalUrl: string };
  approvalCompleted: { requesterName: string; requestType: string; decision: "Approved" | "Rejected"; decidedBy: string; note?: string; itemUrl?: string };
}

// Compile-time guarantee that EmailPayloads covers exactly the EmailKind union.
type _AssertComplete = EmailKind extends keyof EmailPayloads ? true : never;
const _assert: _AssertComplete = true;
void _assert;

export const TEMPLATES: {
  [K in EmailKind]: (data: EmailPayloads[K]) => EmailContent;
} = {
  teamInvite: account.teamInvite,
  accountCreated: account.accountCreated,
  teamAnnouncement: account.teamAnnouncement,
  passwordReset: account.passwordReset,

  meetingInvitation: work.meetingInvitation,
  taskAssignment: work.taskAssignment,
  taskCompleted: work.taskCompleted,
  taskOverdue: work.taskOverdue,
  approvalRequest: work.approvalRequest,
  approvalCompleted: work.approvalCompleted,
};
