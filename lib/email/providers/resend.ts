import { Resend } from "resend";

import type { EmailProvider, OutgoingEmail } from "../types";

/**
 * Production email provider — Resend. Provider-agnostic: it receives a fully
 * resolved message (from/to/subject/html/text/replyTo) and transmits it. All
 * branding, sender selection, and content live upstream.
 *
 * Only imported when RESEND_API_KEY is present (see email/index.ts).
 */
export class ResendProvider implements EmailProvider {
  private readonly resend: Resend;

  constructor(apiKey: string) {
    this.resend = new Resend(apiKey);
  }

  async send(message: OutgoingEmail): Promise<void> {
    const { error } = await this.resend.emails.send({
      from: message.from,
      to: message.to,
      subject: message.subject,
      html: message.html,
      text: message.text,
      ...(message.replyTo ? { replyTo: message.replyTo } : {}),
    });
    if (error) throw new Error(`Resend error: ${error.message}`);
  }
}
