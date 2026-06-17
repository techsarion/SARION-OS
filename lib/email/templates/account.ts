import { brand, escapeHtml, type EmailContent } from "../design";
import {
  emailLayout,
  heading,
  paragraph,
  button,
  mutedNote,
  infoCard,
  metaTable,
  textSignature,
} from "../layout";

const firstName = (name: string) => name.trim().split(/\s+/)[0] || name;
const loginUrl = `${brand.url}/login`;

// ── Team invitation ─────────────────────────────────────────────────────────
export function teamInvite(data: {
  inviteeName: string;
  inviterName: string;
  role: string;
  department?: string;
  inviteUrl: string;
  expiryDays: number;
}): EmailContent {
  const body =
    heading(`You've been added to ${brand.name}`) +
    paragraph(
      `Hi ${escapeHtml(firstName(data.inviteeName))}, <strong style="color:${brand.ink};">${escapeHtml(data.inviterName)}</strong> has invited you to join the company workspace on ${brand.name} — our internal platform for work, meetings, approvals, and people operations.`,
    ) +
    metaTable([
      { label: "Role", value: escapeHtml(data.role) },
      ...(data.department ? [{ label: "Department", value: escapeHtml(data.department) }] : []),
    ]) +
    button({ href: data.inviteUrl, label: "Accept invitation & set password" }) +
    mutedNote(
      `This invitation expires in ${data.expiryDays} days. If you weren't expecting it, please contact your administrator or simply ignore this email.`,
    );
  return {
    subject: `You've been invited to ${brand.name}`,
    html: emailLayout({
      preheader: `${data.inviterName} invited you to the ${brand.name} workspace.`,
      body,
      headerTitle: "Workspace invitation",
    }),
    text: `You've been added to ${brand.name}

Hi ${firstName(data.inviteeName)}, ${data.inviterName} has invited you to join the company workspace.

Role: ${data.role}${data.department ? `\nDepartment: ${data.department}` : ""}

Accept your invitation and set a password:
${data.inviteUrl}

This invitation expires in ${data.expiryDays} days.

${textSignature()}`,
  };
}

// ── Account created ─────────────────────────────────────────────────────────
export function accountCreated(data: {
  name: string;
  email: string;
  role: string;
  tempPassword?: string;
  loginUrl?: string;
}): EmailContent {
  const cta = data.loginUrl ?? loginUrl;
  const body =
    heading(`Your ${brand.name} account is ready`) +
    paragraph(
      `Welcome aboard, ${escapeHtml(firstName(data.name))}. An administrator has created your account on ${brand.name}. Here are your access details:`,
    ) +
    metaTable([
      { label: "Work email", value: escapeHtml(data.email) },
      { label: "Role", value: escapeHtml(data.role) },
      ...(data.tempPassword
        ? [{ label: "Temp password", value: `<span style="font-family:monospace;">${escapeHtml(data.tempPassword)}</span>` }]
        : []),
    ]) +
    button({ href: cta, label: "Sign in to Team OS" }) +
    (data.tempPassword
      ? infoCard(
          `<p class="email-body" style="margin:0;font-size:14px;color:${brand.body};line-height:1.6;">For security, please change this temporary password the first time you sign in.</p>`,
          "warning",
        )
      : mutedNote("Use your work email to sign in. If you didn't expect this account, contact your administrator."));
  return {
    subject: `Your ${brand.name} account is ready`,
    html: emailLayout({ preheader: `Your ${brand.name} account has been created.`, body, headerTitle: "Account created" }),
    text: `Your ${brand.name} account is ready

Welcome aboard, ${firstName(data.name)}.

Work email: ${data.email}
Role: ${data.role}${data.tempPassword ? `\nTemporary password: ${data.tempPassword}` : ""}

Sign in: ${cta}
${data.tempPassword ? "\nPlease change your temporary password on first sign in." : ""}

${textSignature()}`,
  };
}

// ── Password reset ──────────────────────────────────────────────────────────
export function passwordReset(data: { resetUrl: string; name?: string }): EmailContent {
  const hi = data.name ? `${escapeHtml(firstName(data.name))}, we` : "We";
  const body =
    heading("Reset your password") +
    paragraph(
      `${hi} received a request to reset the password for your ${brand.name} account. Click below to choose a new one. This link expires in 1 hour.`,
    ) +
    button({ href: data.resetUrl, label: "Reset password" }) +
    mutedNote(
      "If you didn't request this, you can safely ignore this email — your password won't change. For anything unusual, contact your administrator.",
    );
  return {
    subject: `Reset your ${brand.name} password`,
    html: emailLayout({ preheader: `Reset your ${brand.name} password (link expires in 1 hour).`, body }),
    text: `Reset your password

We received a request to reset your ${brand.name} password. Use the link below within 1 hour:
${data.resetUrl}

If you didn't request this, ignore this email.

${textSignature()}`,
  };
}

// ── Team announcement ───────────────────────────────────────────────────────
export function teamAnnouncement(data: {
  title: string;
  body: string;
  authorName: string;
  ctaLabel?: string;
  ctaUrl?: string;
}): EmailContent {
  const content =
    heading(escapeHtml(data.title)) +
    paragraph(escapeHtml(data.body).replace(/\n/g, "<br>")) +
    (data.ctaUrl ? button({ href: data.ctaUrl, label: data.ctaLabel ?? "View in Team OS" }) : "") +
    mutedNote(`Posted by ${escapeHtml(data.authorName)} · ${brand.name}`);
  return {
    subject: `📣 ${data.title}`,
    html: emailLayout({
      preheader: data.title,
      body: content,
      headerTitle: "Company announcement",
      withSignature: false,
      footerNote: `You're receiving this because you're a member of the ${brand.name} workspace.`,
    }),
    text: `${data.title}

${data.body}${data.ctaUrl ? `\n\n${data.ctaLabel ?? "View in Team OS"}: ${data.ctaUrl}` : ""}

Posted by ${data.authorName} — ${brand.name}`,
  };
}
