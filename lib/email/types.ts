/**
 * A fully-resolved outgoing message — the single shape every provider sends.
 * Templates + the sender matrix produce this; providers just transmit it.
 */
export interface OutgoingEmail {
  /** RFC 5322 "Display Name <addr>" — resolved from the sender matrix. */
  from: string;
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  /** Where replies should go (e.g. the visitor for a contact-form notification). */
  replyTo?: string;
}

export interface EmailProvider {
  send(message: OutgoingEmail): Promise<void>;
}
