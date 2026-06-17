import { brand, escapeHtml, type EmailContent } from "../design";
import {
  emailLayout,
  heading,
  eyebrow,
  paragraph,
  button,
  mutedNote,
  infoCard,
  metaTable,
  statusBadge,
  textSignature,
} from "../layout";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;

// ── Meeting invitation ──────────────────────────────────────────────────────
export function meetingInvitation(data: {
  inviteeName: string;
  title: string;
  dateTime: string;
  durationMin?: number;
  organizer: string;
  location?: string;
  meetingUrl?: string;
  agenda?: string;
}): EmailContent {
  const body =
    eyebrow("Meeting invitation") +
    heading(escapeHtml(data.title)) +
    paragraph(`Hi ${escapeHtml(firstName(data.inviteeName))}, you've been invited to the following meeting on ${brand.name}.`) +
    metaTable([
      { label: "When", value: escapeHtml(data.dateTime) },
      ...(data.durationMin ? [{ label: "Duration", value: `${data.durationMin} min` }] : []),
      { label: "Organizer", value: escapeHtml(data.organizer) },
      ...(data.location ? [{ label: "Location", value: escapeHtml(data.location) }] : []),
    ]) +
    (data.agenda
      ? infoCard(
          `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${brand.muted};">Agenda</p>` +
            `<p class="email-body" style="margin:0;font-size:14px;color:${brand.body};line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.agenda)}</p>`,
        )
      : "") +
    (data.meetingUrl ? button({ href: data.meetingUrl, label: "Join / view meeting" }) : "") +
    mutedNote("Add this to your calendar so you don't miss it. Need to decline? Let the organizer know.");
  return {
    subject: `Meeting: ${data.title} — ${data.dateTime}`,
    html: emailLayout({ preheader: `${data.title} · ${data.dateTime}`, body }),
    text: `Meeting invitation — ${data.title}

When: ${data.dateTime}${data.durationMin ? `\nDuration: ${data.durationMin} min` : ""}
Organizer: ${data.organizer}${data.location ? `\nLocation: ${data.location}` : ""}${data.agenda ? `\n\nAgenda:\n${data.agenda}` : ""}${data.meetingUrl ? `\n\nJoin: ${data.meetingUrl}` : ""}

${textSignature()}`,
  };
}

// ── Task assignment ─────────────────────────────────────────────────────────
const PRIORITY_TONE = { P0: "danger", P1: "warning", P2: "neutral", P3: "neutral" } as const;

export function taskAssignment(data: {
  assigneeName: string;
  taskTitle: string;
  assignedBy: string;
  priority: string;
  dueDate?: string;
  project?: string;
  taskUrl: string;
}): EmailContent {
  const tone = (PRIORITY_TONE as Record<string, "danger" | "warning" | "neutral">)[data.priority] ?? "neutral";
  const body =
    eyebrow("Task assigned to you") +
    heading(escapeHtml(data.taskTitle)) +
    paragraph(`Hi ${escapeHtml(firstName(data.assigneeName))}, <strong style="color:${brand.ink};">${escapeHtml(data.assignedBy)}</strong> assigned you a new task on ${brand.name}.`) +
    metaTable([
      { label: "Priority", value: statusBadge(data.priority, tone) },
      ...(data.project ? [{ label: "Project", value: escapeHtml(data.project) }] : []),
      ...(data.dueDate ? [{ label: "Due", value: escapeHtml(data.dueDate) }] : []),
      { label: "Assigned by", value: escapeHtml(data.assignedBy) },
    ]) +
    button({ href: data.taskUrl, label: "Open task" }) +
    mutedNote("Update the status as you make progress so your team stays in sync.");
  return {
    subject: `New task assigned: ${data.taskTitle}`,
    html: emailLayout({ preheader: `${data.assignedBy} assigned you "${data.taskTitle}".`, body }),
    text: `Task assigned to you — ${data.taskTitle}

Assigned by: ${data.assignedBy}
Priority: ${data.priority}${data.project ? `\nProject: ${data.project}` : ""}${data.dueDate ? `\nDue: ${data.dueDate}` : ""}

Open task: ${data.taskUrl}

${textSignature()}`,
  };
}

// ── Task completed ──────────────────────────────────────────────────────────
export function taskCompleted(data: {
  recipientName: string;
  taskTitle: string;
  completedBy: string;
  project?: string;
  taskUrl: string;
}): EmailContent {
  const body =
    eyebrow("Task completed") +
    heading(escapeHtml(data.taskTitle)) +
    paragraph(`Hi ${escapeHtml(firstName(data.recipientName))}, <strong style="color:${brand.ink};">${escapeHtml(data.completedBy)}</strong> marked this task as completed on ${brand.name}.`) +
    metaTable([
      { label: "Status", value: statusBadge("Completed", "success") },
      ...(data.project ? [{ label: "Project", value: escapeHtml(data.project) }] : []),
      { label: "Completed by", value: escapeHtml(data.completedBy) },
    ]) +
    button({ href: data.taskUrl, label: "View task" });
  return {
    subject: `Completed: ${data.taskTitle}`,
    html: emailLayout({ preheader: `${data.completedBy} completed "${data.taskTitle}".`, body, accentColor: brand.success }),
    text: `Task completed — ${data.taskTitle}

Completed by: ${data.completedBy}${data.project ? `\nProject: ${data.project}` : ""}

View task: ${data.taskUrl}

${textSignature()}`,
  };
}

// ── Task overdue ────────────────────────────────────────────────────────────
export function taskOverdue(data: {
  assigneeName: string;
  taskTitle: string;
  dueDate: string;
  priority: string;
  taskUrl: string;
}): EmailContent {
  const body =
    eyebrow("Task overdue") +
    heading(escapeHtml(data.taskTitle)) +
    paragraph(`Hi ${escapeHtml(firstName(data.assigneeName))}, this task is past its due date and still open. Please update its status or reach out to your lead if you're blocked.`) +
    metaTable([
      { label: "Was due", value: escapeHtml(data.dueDate) },
      { label: "Priority", value: statusBadge(data.priority, data.priority === "P0" ? "danger" : "warning") },
    ]) +
    button({ href: data.taskUrl, label: "Open task", variant: "danger" });
  return {
    subject: `Overdue: ${data.taskTitle}`,
    html: emailLayout({ preheader: `"${data.taskTitle}" was due ${data.dueDate}.`, body, accentColor: brand.danger }),
    text: `Task overdue — ${data.taskTitle}

Was due: ${data.dueDate}
Priority: ${data.priority}

Open task: ${data.taskUrl}

${textSignature()}`,
  };
}

// ── Approval request ────────────────────────────────────────────────────────
export function approvalRequest(data: {
  approverName: string;
  requestType: string;
  requestedBy: string;
  summary: string;
  amount?: string;
  approvalUrl: string;
}): EmailContent {
  const body =
    eyebrow("Approval required") +
    heading(`${escapeHtml(data.requestType)} awaiting your decision`) +
    paragraph(`Hi ${escapeHtml(firstName(data.approverName))}, <strong style="color:${brand.ink};">${escapeHtml(data.requestedBy)}</strong> submitted a request that needs your approval.`) +
    metaTable([
      { label: "Type", value: escapeHtml(data.requestType) },
      { label: "Requested by", value: escapeHtml(data.requestedBy) },
      ...(data.amount ? [{ label: "Amount", value: escapeHtml(data.amount) }] : []),
    ]) +
    infoCard(
      `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${brand.muted};">Summary</p>` +
        `<p class="email-body" style="margin:0;font-size:14px;color:${brand.body};line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.summary)}</p>`,
    ) +
    button({ href: data.approvalUrl, label: "Review & decide" }) +
    mutedNote("Requests left pending can block your team — please review when you can.");
  return {
    subject: `Approval needed: ${data.requestType} from ${data.requestedBy}`,
    html: emailLayout({ preheader: `${data.requestedBy} needs your approval on a ${data.requestType}.`, body, accentColor: brand.warning }),
    text: `Approval required — ${data.requestType}

Requested by: ${data.requestedBy}${data.amount ? `\nAmount: ${data.amount}` : ""}

Summary:
${data.summary}

Review & decide: ${data.approvalUrl}

${textSignature()}`,
  };
}

// ── Approval completed ──────────────────────────────────────────────────────
export function approvalCompleted(data: {
  requesterName: string;
  requestType: string;
  decision: "Approved" | "Rejected";
  decidedBy: string;
  note?: string;
  itemUrl?: string;
}): EmailContent {
  const approved = data.decision === "Approved";
  const tone = approved ? "success" : "danger";
  const accent = approved ? brand.success : brand.danger;
  const body =
    eyebrow("Decision recorded") +
    heading(`Your ${escapeHtml(data.requestType.toLowerCase())} was ${escapeHtml(data.decision.toLowerCase())}`) +
    paragraph(`Hi ${escapeHtml(firstName(data.requesterName))}, here's an update on the request you submitted.`) +
    metaTable([
      { label: "Type", value: escapeHtml(data.requestType) },
      { label: "Decision", value: statusBadge(data.decision, tone) },
      { label: "Decided by", value: escapeHtml(data.decidedBy) },
    ]) +
    (data.note
      ? infoCard(
          `<p style="margin:0 0 6px;font-size:12px;font-weight:600;letter-spacing:0.04em;text-transform:uppercase;color:${brand.muted};">Note</p>` +
            `<p class="email-body" style="margin:0;font-size:14px;color:${brand.body};line-height:1.6;white-space:pre-wrap;">${escapeHtml(data.note)}</p>`,
          approved ? "success" : "danger",
        )
      : "") +
    (data.itemUrl ? button({ href: data.itemUrl, label: "View details" }) : "");
  return {
    subject: `${data.requestType} ${data.decision.toLowerCase()} — ${brand.name}`,
    html: emailLayout({ preheader: `Your ${data.requestType} was ${data.decision.toLowerCase()}.`, body, accentColor: accent }),
    text: `Decision recorded — ${data.requestType} ${data.decision}

Type: ${data.requestType}
Decision: ${data.decision}
Decided by: ${data.decidedBy}${data.note ? `\n\nNote:\n${data.note}` : ""}${data.itemUrl ? `\n\nView: ${data.itemUrl}` : ""}

${textSignature()}`,
  };
}
