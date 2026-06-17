# Sarion Team OS — Email System

Internal-only email for the company operating system. Branded **Sarion Team OS**,
sent through **Resend** (same API key as the customer app, different sender
identities) with a console fallback in dev. Architecture mirrors the proven
hub/retry/provider pattern; templates and senders are internal-only.

## 1. Sender matrix

Two identities on the already-verified `trysarion.com` domain
([`lib/email/senders.ts`](../lib/email/senders.ts)):

| Sender | Address | Used for |
|--------|---------|----------|
| `team` | `team@trysarion.com` (display: "Sarion Team OS") | human-feel, relationship/people-ops |
| `system` | `no-reply@trysarion.com` (display: "Sarion Team OS") | automated system notifications |

## 2. Templates (8 internal kinds)

| Kind | Sender | Trigger |
|------|--------|---------|
| `teamInvite` | team@ | Admin/Head invites a member |
| `accountCreated` | team@ | Admin provisions an account |
| `teamAnnouncement` | team@ | Company/department broadcast |
| `passwordReset` | no-reply@ | Password reset request |
| `meetingInvitation` | no-reply@ | Meeting scheduled / invitee added |
| `taskAssignment` | no-reply@ | Task assigned to a user |
| `approvalRequest` | no-reply@ | Approval routed to an approver |
| `approvalCompleted` | no-reply@ | Approver approves/rejects a request |

No billing, sales, marketing, or customer-facing templates exist — this is an
internal platform.

## 3. Architecture

```
lib/email/
  design.ts        — Team OS brand tokens + EmailContent type (Inter, 2px, no serif)
  layout.ts        — emailLayout() + components (button, infoCard, metaTable, badge…)
  senders.ts       — EmailKind union (8), team/system matrix, fromFor()
  types.ts         — OutgoingEmail + EmailProvider contract
  index.ts         — sendEmail / sendEmailSafe + helpers + provider singleton
  providers/       — resend.ts (prod) · console.ts (dev fallback)
  templates/
    index.ts       — EmailPayloads + TEMPLATES registry (type-safe)
    account.ts     — teamInvite, accountCreated, passwordReset, teamAnnouncement
    work.ts        — meetingInvitation, taskAssignment, approvalRequest, approvalCompleted
  samples.ts       — representative payloads for preview/test
```

## 4. Usage

```ts
import { sendEmail, sendEmailSafe, sendInviteEmail, sendAnnouncementEmail } from "@/lib/email";

// Type-safe: payload checked against the template, sender automatic.
await sendEmail("taskAssignment", assignee.email, {
  assigneeName: assignee.fullName, taskTitle, assignedBy, priority, taskUrl,
});

// Best-effort helpers
await sendInviteEmail({ to, inviteeName, inviterName, role, inviteUrl, expiryDays: 7 });
await sendAnnouncementEmail(recipientEmails, { title, body, authorName });
```

`sendEmail` throws on failure (after 3 retries w/ backoff); `sendEmailSafe`
never throws — use it for best-effort notifications so email can't break a user
action. Structured `[email]` JSON logs + `onEmailFailure()` monitoring hook.

## 5. Hardening & test surface

- Retry w/ exponential backoff (0 / 300ms / 900ms); structured logs.
- **Preview:** `npm run email:preview` → renders all 8 to `.email-previews/*.html` + gallery.
- **Guarded route:** `GET /api/dev/email-test` (list / `?kind=` preview / `?kind=&to=` send).
  Prod-gated behind `EMAIL_TEST_TOKEN`.

## 6. Deliverability — manual setup

1. `RESEND_API_KEY` set in production (else console-only).
2. `team@` and `no-reply@` verified on `trysarion.com` (SPF/DKIM/DMARC already configured).
3. Logo loads from `${NEXT_PUBLIC_APP_URL}/light-theme-logo-SARION.png` — keep publicly reachable.
