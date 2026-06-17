/**
 * Sender mapping matrix — the single authority for WHICH address sends WHAT.
 * Sarion Team OS is internal-only, so there are just two sender identities:
 *
 *   team@     → human-feel, relationship + people ops (invites, account created,
 *               announcements). Replies are welcome.
 *   no-reply@ → automated system notifications (password reset, task/meeting/
 *               approval notices). Not monitored for replies.
 *
 * Both authenticate on the already-verified trysarion.com domain and send
 * through the same Resend API key. `from` carries a friendly display name so
 * inboxes show "Sarion Team OS".
 */

export type SenderKey = "team" | "system";

interface SenderProfile {
  address: string;
  displayName: string;
}

export const SENDERS: Record<SenderKey, SenderProfile> = {
  team: { address: "team@trysarion.com", displayName: "Sarion Team OS" },
  system: { address: "no-reply@trysarion.com", displayName: "Sarion Team OS" },
};

/** Every internal email the system can send. */
export type EmailKind =
  // People / relationship (team@)
  | "teamInvite"
  | "accountCreated"
  | "teamAnnouncement"
  // System / transactional (no-reply@)
  | "passwordReset"
  | "meetingInvitation"
  | "taskAssignment"
  | "taskCompleted"
  | "taskOverdue"
  | "approvalRequest"
  | "approvalCompleted";

/** Workflow → sender. Drives deliverability + correct voice. */
export const SENDER_FOR: Record<EmailKind, SenderKey> = {
  teamInvite: "team",
  accountCreated: "team",
  teamAnnouncement: "team",

  passwordReset: "system",
  meetingInvitation: "system",
  taskAssignment: "system",
  taskCompleted: "system",
  taskOverdue: "system",
  approvalRequest: "system",
  approvalCompleted: "system",
};

/** RFC 5322 "Display Name <addr>" string for the Resend `from` field. */
export function fromFor(kind: EmailKind): string {
  const profile = SENDERS[SENDER_FOR[kind]];
  return `${profile.displayName} <${profile.address}>`;
}

/** The bare address (e.g. for documentation / reply-to defaults). */
export function addressFor(kind: EmailKind): string {
  return SENDERS[SENDER_FOR[kind]].address;
}
