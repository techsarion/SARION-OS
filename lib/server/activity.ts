import 'server-only';
// Central activity / audit logging — mirrors the S app's logActivity() pattern.
// Writes to the immutable `audit_log` table (supabase/migrations/0002 et al.)
// so every meaningful mutation leaves a who-did-what-when trail.
//
// Usage (inside a Server Action, after the mutation succeeds):
//   await logActivity({ action: 'task.assign', resourceType: 'task',
//                       resourceId: task.id, after: { assigneeId } });
import { createAdminClient } from '@/lib/supabase/admin';
import { getCurrentUser } from '@/lib/auth';
import type { Database } from '@/types/database.types';

type AuditInsert = Database['public']['Tables']['audit_log']['Insert'];

export interface ActivityInput {
  /** Verb-noun action key, e.g. "task.create", "approval.decide", "user.invite". */
  action: string;
  /** Entity kind the action targeted, e.g. "task" | "project" | "meeting". */
  resourceType: string;
  /** Affected row id (optional for broad actions like a broadcast). */
  resourceId?: string | null;
  /** Snapshot before the change (optional). */
  before?: unknown;
  /** Snapshot after the change (optional). */
  after?: unknown;
  /** Override the actor (defaults to the current authenticated user). */
  actorId?: string;
}

/**
 * Best-effort audit write — NEVER throws, so a logging failure can't roll back
 * or break a user action. Failures are logged to the server console for alerting.
 */
export async function logActivity(input: ActivityInput): Promise<void> {
  try {
    const actorId = input.actorId ?? (await getCurrentUser())?.id ?? null;
    // Audit rows are written with the service role — RLS has no authenticated
    // insert policy on audit_log (it's append-only, admin-read).
    const supabase = createAdminClient();
    // `row` is fully type-checked against the real audit_log Insert shape.
    const row: AuditInsert = {
      actor_id: actorId,
      action: input.action,
      resource_type: input.resourceType,
      resource_id: input.resourceId ?? null,
      before: (input.before ?? null) as AuditInsert['before'],
      after: (input.after ?? null) as AuditInsert['after'],
    };
    // The `as never` bridges a dependency version skew (@supabase/ssr ships an
    // older supabase-js than the hoisted postgrest-js, which degrades typed
    // INSERTs to `never`). Selects are unaffected; remove once deps are aligned.
    const { error } = await supabase.from('audit_log').insert(row as never);
    if (error) {
      console.error(`[activity] ${JSON.stringify({ event: 'insert.failed', action: input.action, error: error.message })}`);
    }
  } catch (err) {
    console.error(`[activity] ${JSON.stringify({ event: 'insert.threw', action: input.action, error: err instanceof Error ? err.message : String(err) })}`);
  }
}
