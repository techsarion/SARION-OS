import type { EmailKind } from "./senders";
import type { EmailPayloads } from "./templates";

/**
 * Representative sample payloads for every template — used by the email preview
 * script and the guarded test route so each template can be rendered/sent with
 * realistic data. Kept exhaustive via the mapped type (a missing kind won't
 * compile).
 */
export const SAMPLE_PAYLOADS: { [K in EmailKind]: EmailPayloads[K] } = {
  teamInvite: {
    inviteeName: "Jordan Lee",
    inviterName: "Aria Shah",
    role: "Department Head",
    department: "Engineering",
    inviteUrl: "https://trysarion.com/invite?token=sample",
    expiryDays: 7,
  },
  accountCreated: {
    name: "Jordan Lee",
    email: "jordan.lee@trysarion.com",
    role: "Employee",
    tempPassword: "Temp-7fK29p",
    loginUrl: "https://trysarion.com/login",
  },
  teamAnnouncement: {
    title: "Q3 All-Hands — Thursday 4 PM",
    body: "Join the company-wide all-hands this Thursday. We'll cover Q3 targets, the new approval workflow, and recognise this quarter's standout teams.",
    authorName: "Managing Director",
    ctaLabel: "View details",
    ctaUrl: "https://trysarion.com/announcements/sample",
  },
  passwordReset: { resetUrl: "https://trysarion.com/reset-password?token=sample", name: "Jordan Lee" },

  meetingInvitation: {
    inviteeName: "Jordan Lee",
    title: "Atlas Migration — Weekly Sync",
    dateTime: "Tue, Jul 1 · 2:00 PM IST",
    durationMin: 45,
    organizer: "Dev Mehta",
    location: "Meeting Room 3 / Google Meet",
    meetingUrl: "https://trysarion.com/meetings/sample",
    agenda: "1. Migration status\n2. Blocked dependencies\n3. Cutover plan",
  },
  taskAssignment: {
    assigneeName: "Jordan Lee",
    taskTitle: "Finalise the Q3 billing revamp spec",
    assignedBy: "Priya Nair",
    priority: "P1",
    dueDate: "Jul 4, 2026",
    project: "Billing Revamp",
    taskUrl: "https://trysarion.com/tasks/sample",
  },
  taskCompleted: {
    recipientName: "Priya Nair",
    taskTitle: "Finalise the Q3 billing revamp spec",
    completedBy: "Jordan Lee",
    project: "Billing Revamp",
    taskUrl: "https://trysarion.com/tasks/sample",
  },
  taskOverdue: {
    assigneeName: "Jordan Lee",
    taskTitle: "Finalise the Q3 billing revamp spec",
    dueDate: "Jul 4, 2026",
    priority: "P1",
    taskUrl: "https://trysarion.com/tasks/sample",
  },
  approvalRequest: {
    approverName: "Aria Shah",
    requestType: "Expense",
    requestedBy: "Dev Mehta",
    summary: "Q3 travel for the Sales offsite — flights + 2 nights accommodation.",
    amount: "$4,200",
    approvalUrl: "https://trysarion.com/approvals/sample",
  },
  approvalCompleted: {
    requesterName: "Dev Mehta",
    requestType: "Expense",
    decision: "Approved",
    decidedBy: "Aria Shah",
    note: "Approved — please book through the corporate travel desk.",
    itemUrl: "https://trysarion.com/approvals/sample",
  },
};

export const ALL_EMAIL_KINDS = Object.keys(SAMPLE_PAYLOADS) as EmailKind[];
