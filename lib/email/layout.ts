/**
 * Reusable email layout + component builders. Everything that renders chrome or
 * a shared UI primitive lives here, so individual templates only describe their
 * unique content. All output is table-based, inline-styled HTML for maximum
 * email-client compatibility (Outlook included), with a progressive dark-mode
 * layer for clients that honour `prefers-color-scheme`.
 */
import { brand, escapeHtml } from "./design";

/** Optional social links — wired but empty until real profiles exist. */
export const SOCIAL_LINKS: { label: string; href: string }[] = [];

// ── Content primitives ──────────────────────────────────────────────────────

export function heading(text: string): string {
  return `<h1 class="email-ink" style="margin:0 0 16px;font-family:${brand.fontDisplay};font-size:24px;font-weight:700;line-height:1.25;color:${brand.ink};letter-spacing:-0.01em;">${text}</h1>`;
}

export function eyebrow(text: string): string {
  return `<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:${brand.primary};">${escapeHtml(text)}</p>`;
}

/** Body paragraph. `html` is trusted (template-authored); escape user input upstream. */
export function paragraph(html: string): string {
  return `<p class="email-body" style="margin:0 0 20px;font-size:15px;color:${brand.body};line-height:1.65;">${html}</p>`;
}

export function mutedNote(html: string): string {
  return `<p style="margin:20px 0 0;font-size:13px;color:${brand.muted};line-height:1.55;">${html}</p>`;
}

export function divider(): string {
  return `<div style="height:1px;background:${brand.line};margin:28px 0;"></div>`;
}

type ButtonVariant = "primary" | "secondary" | "danger";

export function button(opts: {
  href: string;
  label: string;
  variant?: ButtonVariant;
}): string {
  const v = opts.variant ?? "primary";
  const bg =
    v === "primary" ? brand.primary : v === "danger" ? brand.danger : "#FFFFFF";
  const color = v === "secondary" ? brand.ink : "#FFFFFF";
  const border = v === "secondary" ? `1px solid ${brand.line}` : "none";
  // VML fallback gives Outlook a real rounded button.
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:4px 0 8px;"><tr><td style="border-radius:${brand.radiusBtn};background:${bg};">
    <a href="${opts.href}" target="_blank" style="display:inline-block;background:${bg};color:${color};border:${border};text-decoration:none;font-size:15px;font-weight:600;line-height:1;padding:13px 28px;border-radius:${brand.radiusBtn};">${escapeHtml(opts.label)}</a>
  </td></tr></table>`;
}

/** A soft "info card" used to highlight a message, summary, or detail block. */
export function infoCard(innerHtml: string, tone: "neutral" | "success" | "danger" | "warning" = "neutral"): string {
  const bg =
    tone === "success"
      ? brand.successBg
      : tone === "danger"
        ? brand.dangerBg
        : tone === "warning"
          ? brand.warningBg
          : brand.subtleBg;
  const border =
    tone === "success"
      ? "#BBF7D0"
      : tone === "danger"
        ? "#FECACA"
        : tone === "warning"
          ? "#FDE68A"
          : brand.line;
  return `<div class="email-subtle" style="background:${bg};border:1px solid ${border};border-radius:${brand.radiusCard};padding:18px 20px;margin:0 0 24px;">${innerHtml}</div>`;
}

/** Label/value rows (e.g. invoice or booking details). */
export function metaTable(rows: { label: string; value: string }[]): string {
  const body = rows
    .map(
      (r) => `
      <tr>
        <td style="padding:7px 0;font-size:13px;color:${brand.muted};width:120px;vertical-align:top;">${escapeHtml(r.label)}</td>
        <td class="email-ink" style="padding:7px 0;font-size:15px;color:${brand.ink};font-weight:500;">${r.value}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">${body}</table>`;
}

export function statusBadge(label: string, tone: "success" | "danger" | "warning" | "neutral" = "neutral"): string {
  const map = {
    success: { bg: brand.successBg, fg: brand.success, br: "#BBF7D0" },
    danger: { bg: brand.dangerBg, fg: brand.danger, br: "#FECACA" },
    warning: { bg: brand.warningBg, fg: brand.warning, br: "#FDE68A" },
    neutral: { bg: brand.subtleBg, fg: brand.body, br: brand.line },
  }[tone];
  return `<span style="display:inline-block;background:${map.bg};color:${map.fg};border:1px solid ${map.br};border-radius:${brand.radiusChip};font-size:12px;font-weight:600;padding:3px 10px;">${escapeHtml(label)}</span>`;
}

/** Standard sign-off block — present on every customer-facing email. */
export function signature(): string {
  return `
    <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 0;"><tr><td>
      <p class="email-body" style="margin:0 0 2px;font-size:15px;color:${brand.body};line-height:1.6;">Best regards,</p>
      <p class="email-ink" style="margin:0;font-size:15px;font-weight:600;color:${brand.ink};">The ${brand.name} Team</p>
      <p style="margin:6px 0 0;font-size:13px;color:${brand.muted};line-height:1.6;">
        <a href="mailto:${brand.supportEmail}" style="color:${brand.primary};text-decoration:none;">${brand.supportEmail}</a><br>
        <a href="${brand.url}" target="_blank" style="color:${brand.primary};text-decoration:none;">${brand.url.replace(/^https?:\/\//, "")}</a>
      </p>
    </td></tr></table>`;
}

// ── Shell ─────────────────────────────────────────────────────────────────

function footer(note?: string): string {
  const social =
    SOCIAL_LINKS.length > 0
      ? `<p style="margin:0 0 10px;font-size:12px;">${SOCIAL_LINKS.map(
          (s) =>
            `<a href="${s.href}" target="_blank" style="color:${brand.muted};text-decoration:none;margin:0 6px;">${escapeHtml(s.label)}</a>`,
        ).join("·")}</p>`
      : "";
  return `
        <tr><td style="padding:24px 8px 0;text-align:center;">
          ${social}
          <p style="margin:0 0 4px;font-size:12px;color:${brand.muted};line-height:1.55;">
            ${note ? escapeHtml(note) : `${brand.name} — ${brand.tagline}`}
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:${brand.muted};line-height:1.55;">
            <a href="mailto:${brand.supportEmail}" style="color:${brand.muted};text-decoration:underline;">${brand.supportEmail}</a>
            &nbsp;·&nbsp;
            <a href="${brand.url}" target="_blank" style="color:${brand.muted};text-decoration:underline;">${brand.url.replace(/^https?:\/\//, "")}</a>
          </p>
          <p style="margin:0;font-size:12px;color:${brand.faint};">© ${new Date().getFullYear()} ${brand.name}. All rights reserved.</p>
        </td></tr>`;
}

/**
 * Assemble a complete, responsive, dark-mode-aware email document.
 * Templates pass their unique inner `body`; the layout supplies header (logo +
 * optional title), the card frame, the accent bar, footer, and (by default) the
 * signature.
 */
export function emailLayout(opts: {
  preheader: string;
  body: string;
  /** Accent bar colour at the top of the card. Defaults to brand primary. */
  accentColor?: string;
  /** Small title shown under the logo in the header. */
  headerTitle?: string;
  /** Override the footer micro-copy. */
  footerNote?: string;
  /** Append the standard signature inside the card. Default true. */
  withSignature?: boolean;
}): string {
  const accent = opts.accentColor ?? brand.primary;
  const headerTitle = opts.headerTitle
    ? `<p style="margin:10px 0 0;font-size:13px;font-weight:600;color:${brand.muted};">${escapeHtml(opts.headerTitle)}</p>`
    : "";
  const sig = opts.withSignature === false ? "" : signature();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${escapeHtml(opts.headerTitle ?? brand.name)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body,p,h1,h2,h3,td,span,a{font-family:${brand.fontSans};}
    h1{font-family:${brand.fontDisplay};}
    a{text-decoration:none;}
    @media only screen and (max-width:600px){
      .email-pad{padding:28px 24px !important;}
    }
    @media (prefers-color-scheme: dark){
      .email-bg{background:#0B1220 !important;}
      .email-card{background:#0F172A !important;border-color:#1E293B !important;}
      .email-subtle{background:#111B2E !important;border-color:#1E293B !important;}
      .email-ink{color:#F1F5F9 !important;}
      .email-body{color:#CBD5E1 !important;}
    }
  </style>
</head>
<body class="email-bg" style="margin:0;padding:0;background:${brand.pageBg};font-family:${brand.fontSans};">
  <span style="display:none!important;visibility:hidden;opacity:0;color:transparent;height:0;width:0;overflow:hidden;mso-hide:all;">${escapeHtml(opts.preheader)}</span>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" class="email-bg" style="background:${brand.pageBg};padding:40px 16px;">
    <tr><td align="center">
      <table role="presentation" width="${brand.maxWidth}" cellpadding="0" cellspacing="0" style="max-width:100%;width:100%;">

        <!-- Header -->
        <tr><td style="padding:0 8px 22px;text-align:left;">
          <a href="${brand.url}" target="_blank" style="text-decoration:none;">
            <img src="${brand.logoLight}" alt="${brand.name}" height="28" style="display:block;border:0;outline:none;height:28px;width:auto;">
          </a>
          ${headerTitle}
        </td></tr>

        <!-- Card -->
        <tr><td class="email-card" style="background:${brand.cardBg};border-radius:${brand.radiusCard};border:1px solid ${brand.line};overflow:hidden;">
          <div style="height:4px;background:${accent};"></div>
          <div class="email-pad" style="padding:34px 40px;">
            ${opts.body}
            ${sig}
          </div>
        </td></tr>

        <!-- Footer -->
        ${footer(opts.footerNote)}

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Shared plain-text signature footer used by every text part. */
export function textSignature(): string {
  return `Best regards,
The ${brand.name} Team
${brand.supportEmail}
${brand.url}`;
}
