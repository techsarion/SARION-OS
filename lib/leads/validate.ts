// Pure field validators shared by the import preview (server) and the wizard
// (client). Deliberately lenient — we flag suspicious values as warnings, never
// hard-block an import on a malformed email/URL.

// Practical email check: something@something.tld, no spaces.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

// Accept bare domains (acme.com), www., and full http(s) URLs.
export function isValidUrl(value: string): boolean {
  const v = value.trim();
  if (!v || /\s/.test(v)) return false;
  const withProto = /^https?:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    // hostname must contain a dot (a TLD) — rejects "localhost"-style junk.
    return u.hostname.includes('.');
  } catch {
    return false;
  }
}
