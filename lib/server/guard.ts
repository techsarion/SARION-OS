import 'server-only';
// Server Action permission guard — the action-layer counterpart to
// lib/auth.ts's requirePermission (which redirects for pages). Returns a typed
// outcome so actions can fail gracefully with the ActionResult pattern.
import { getCurrentUser, type CurrentUser } from '@/lib/auth';
import { can, type Permission } from '@/lib/rbac';
import { fail, type ActionErr } from '@/lib/actions/result';

export type GuardResult = { ok: true; user: CurrentUser } | { ok: false; error: ActionErr };

/** Require an authenticated user with `permission`. Use at the top of an action:
 *    const g = await guard('dept:create');
 *    if (!g.ok) return g.error;
 *    const { user } = g;
 */
export async function guard(permission: Permission): Promise<GuardResult> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: fail('You must be signed in.', { code: 'unauthenticated' }) };
  if (!can(user.role, permission)) {
    return { ok: false, error: fail('You do not have permission to do this.', { code: 'forbidden' }) };
  }
  return { ok: true, user };
}
