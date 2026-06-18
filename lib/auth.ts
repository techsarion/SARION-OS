import 'server-only';
// Server-side auth + RBAC helpers. Use in Server Components and Server Actions.
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { can, type Permission } from '@/lib/rbac';
import type { Role } from '@/types/enums';

export interface CurrentUser {
  id: string;
  email: string;
  fullName: string;
  role: Role;
  departmentId: string | null;
  avatarUrl: string | null;
}

/** Returns the authenticated user's profile, or null if not signed in. */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, department_id, avatar_url')
    .eq('id', user.id)
    .single<{
      id: string;
      email: string;
      full_name: string;
      role: Role;
      department_id: string | null;
      avatar_url: string | null;
    }>();

  if (!profile) return null;
  return {
    id: profile.id,
    email: profile.email,
    fullName: profile.full_name,
    role: profile.role,
    departmentId: profile.department_id ?? null,
    avatarUrl: profile.avatar_url ?? null,
  };
}

/** Require an authenticated user or redirect to /login. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  return user;
}

/** Require a specific permission or redirect to /error (403). */
export async function requirePermission(permission: Permission): Promise<CurrentUser> {
  const user = await requireUser();
  if (!can(user.role, permission)) redirect('/error?code=403');
  return user;
}
