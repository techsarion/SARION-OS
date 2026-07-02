import 'server-only';
// Daily Workspace timeline writer — daily_workspace_activity has no authenticated
// INSERT policy (append-only, like task_activity / lead_activities), so rows are
// written with the service role. Best-effort: never throws.
import { createAdminClient } from '@/lib/supabase/admin';

export type DailyVerb =
  | 'task_created'
  | 'task_completed'
  | 'task_state_changed'
  | 'task_carried'
  | 'task_deleted'
  | 'task_cancelled'
  | 'workspace_completed';

export async function logDailyActivity(
  workspaceId: string | null,
  actorId: string | null,
  verb: DailyVerb,
  meta?: unknown,
): Promise<void> {
  try {
    const admin = createAdminClient();
    await admin
      .from('daily_workspace_activity')
      .insert({ workspace_id: workspaceId, actor_id: actorId, verb, meta: (meta ?? null) as never } as never);
  } catch (err) {
    console.error(`[daily] activity insert failed: ${err instanceof Error ? err.message : String(err)}`);
  }
}
