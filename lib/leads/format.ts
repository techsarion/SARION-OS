// Small presentation helpers for the Lead module (client-safe, no server deps).

/** "3d ago", "2h ago", "just now", or a date for older items. */
export function timeAgo(iso: string): string {
  const then = new Date(iso).getTime();
  const diff = Date.now() - then;
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

/** Human label for a lead_activities verb. */
export function verbLabel(verb: string, meta?: unknown): string {
  const m = (meta ?? {}) as Record<string, unknown>;
  switch (verb) {
    case 'created': return 'Lead created';
    case 'imported': return 'Imported from CSV';
    case 'updated': return 'Details updated';
    case 'assigned': return 'Assigned';
    case 'reassigned': return 'Reassigned';
    case 'status_changed': return `Status → ${String(m.to ?? '').replace(/_/g, ' ')}`;
    case 'note_added': return 'Note added';
    case 'contact_added': return `Contact added${m.name ? `: ${m.name}` : ''}`;
    case 'followup_scheduled': return `Follow-up scheduled${m.due ? ` for ${m.due}` : ''}`;
    case 'followup_completed': return 'Follow-up completed';
    case 'outreach': return String(m.event ?? 'Outreach logged');
    default:
      if (verb.startsWith('bulk_')) return `Bulk ${verb.slice(5)}`;
      return verb.replace(/_/g, ' ');
  }
}

/** Ensure a URL has a protocol so <a href> works from raw handles. */
export function ensureUrl(v: string | null | undefined): string | null {
  if (!v) return null;
  const s = v.trim();
  if (!s) return null;
  if (/^https?:\/\//i.test(s)) return s;
  return `https://${s}`;
}
