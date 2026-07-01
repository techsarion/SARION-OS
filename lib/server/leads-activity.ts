import 'server-only';
// Lead timeline writer — lead_activities has no authenticated INSERT policy
// (append-only, like task_activity), so rows are written with the service role.
// Best-effort: never throws, so a logging failure can't break a user action.
import { createAdminClient } from '@/lib/supabase/admin';

export async function logLeadActivity(
  leadId: string,
  actorId: string | null,
  verb: string,
  meta?: unknown,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from('lead_activities')
      .insert({ lead_id: leadId, actor_id: actorId, verb, meta: (meta ?? null) as never } as never);
  } catch (err) {
    console.error(`[lead] activity insert failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
