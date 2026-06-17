/**
 * Email design tokens for **Sarion Team OS** — the internal company operating
 * system. Every email should read as a native, professional extension of the
 * platform: enterprise voice, no marketing or customer-facing copy.
 *
 * Branding mirrors the Sarion identity (electric blue → cyan, sharp 2px shape,
 * Inter) but the voice is internal operations, not product marketing.
 *
 * Colours are hard-coded hex (email clients can't resolve CSS variables) and
 * kept in one place so a rebrand is a single-file change.
 */

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://trysarion.com";

export const brand = {
  // Identity
  name: "Sarion Team OS",
  shortName: "Team OS",
  url: APP_URL,
  logoLight: `${APP_URL}/light-theme-logo-SARION.png`, // dark wordmark, for light bg
  logoDark: `${APP_URL}/dark-theme-logo-SARION.png`, // light wordmark, for dark bg
  supportEmail: "team@trysarion.com",
  tagline: "Internal Team Operations Platform.",

  // Core palette (light)
  primary: "#2563EB",
  primaryDark: "#1D4ED8",
  accent: "#22B8F0",
  gradient: "linear-gradient(135deg,#2563EB 0%,#22B8F0 100%)",

  // Text
  ink: "#0F172A", // headings
  body: "#475569", // body copy
  muted: "#94A3B8", // secondary / labels
  faint: "#CBD5E1", // copyright / dividers text

  // Surfaces
  pageBg: "#F4F6F9",
  cardBg: "#FFFFFF",
  subtleBg: "#F8FAFC",
  line: "#E2E8F0",

  // Status
  success: "#16A34A",
  successBg: "#F0FDF4",
  danger: "#DC2626",
  dangerBg: "#FEF2F2",
  warning: "#D97706",
  warningBg: "#FFFBEB",

  // Shape — echoes the site's sharp, modern 2px aesthetic.
  radiusCard: "4px",
  radiusBtn: "2px",
  radiusChip: "2px",

  // Layout
  maxWidth: 560,

  // Type stack — Inter throughout; an internal OS reads cleaner with a single
  // sans family than a marketing serif display face.
  fontSans:
    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
  fontDisplay:
    "'Inter',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif",
} as const;

/** Escape interpolated user/content input before placing it in HTML. */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** The unified content contract every template returns. */
export interface EmailContent {
  subject: string;
  html: string;
  text: string;
}
