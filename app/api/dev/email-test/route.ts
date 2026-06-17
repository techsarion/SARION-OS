import { NextRequest, NextResponse } from "next/server";

import { renderEmail, sendEmail } from "@/lib/email";
import { fromFor } from "@/lib/email/senders";
import { SAMPLE_PAYLOADS, ALL_EMAIL_KINDS } from "@/lib/email/samples";
import type { EmailKind } from "@/lib/email";

/**
 * Guarded email test/preview endpoint.
 *
 *   GET  /api/dev/email-test                      → list all kinds + senders
 *   GET  /api/dev/email-test?kind=welcome         → render HTML preview
 *   GET  /api/dev/email-test?kind=welcome&to=x@y  → actually SEND via Resend
 *
 * Access control:
 *   • In non-production: always allowed.
 *   • In production: requires ?token=<EMAIL_TEST_TOKEN> (404 if the env var is
 *     unset, so it's invisible unless you deliberately enable it).
 */
function authorize(req: NextRequest): boolean {
  if (process.env.NODE_ENV !== "production") return true;
  const expected = process.env.EMAIL_TEST_TOKEN;
  if (!expected) return false;
  return req.nextUrl.searchParams.get("token") === expected;
}

export async function GET(req: NextRequest) {
  if (!authorize(req)) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const params = req.nextUrl.searchParams;
  const kindParam = params.get("kind");

  // Index view — list every template, its sender, and a self-link.
  if (!kindParam) {
    return NextResponse.json({
      count: ALL_EMAIL_KINDS.length,
      templates: ALL_EMAIL_KINDS.map((k) => ({
        kind: k,
        from: fromFor(k),
        preview: `/api/dev/email-test?kind=${k}`,
        send: `/api/dev/email-test?kind=${k}&to=you@example.com`,
      })),
    });
  }

  if (!ALL_EMAIL_KINDS.includes(kindParam as EmailKind)) {
    return NextResponse.json(
      { error: `Unknown kind "${kindParam}".`, valid: ALL_EMAIL_KINDS },
      { status: 400 },
    );
  }
  const kind = kindParam as EmailKind;
  const payload = SAMPLE_PAYLOADS[kind];
  const to = params.get("to");

  // Send mode.
  if (to) {
    try {
      await sendEmail(kind, to, payload);
      return NextResponse.json({ ok: true, kind, from: fromFor(kind), to });
    } catch (err) {
      return NextResponse.json(
        { ok: false, kind, error: err instanceof Error ? err.message : String(err) },
        { status: 502 },
      );
    }
  }

  // Preview mode — return the rendered HTML so it can be opened in a browser.
  const content = renderEmail(kind, payload);
  if (params.get("format") === "json") {
    return NextResponse.json({ kind, from: fromFor(kind), subject: content.subject, text: content.text });
  }
  return new NextResponse(content.html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
