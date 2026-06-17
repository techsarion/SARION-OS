import type { EmailProvider, OutgoingEmail } from "../types";

/**
 * Development fallback — logs a message summary to the console instead of
 * sending. Used automatically when RESEND_API_KEY is absent. Never in prod.
 */
export class ConsoleProvider implements EmailProvider {
  async send(message: OutgoingEmail): Promise<void> {
    console.info(
      `\n[email:dev] ─────────────────────────────\n` +
        `  From:     ${message.from}\n` +
        `  To:       ${Array.isArray(message.to) ? message.to.join(", ") : message.to}\n` +
        (message.replyTo ? `  Reply-To: ${message.replyTo}\n` : "") +
        `  Subject:  ${message.subject}\n` +
        `─────────────────────────────────────────\n`,
    );
  }
}
