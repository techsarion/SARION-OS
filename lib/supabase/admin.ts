import 'server-only';
// Service-role Supabase client — BYPASSES Row Level Security. Use ONLY in
// trusted server code for operations RLS intentionally blocks from end users:
//   • writing audit_log (no authenticated insert policy by design)
//   • creating auth users + profiles during invitation acceptance
//   • token-gated invitation lookup before a session exists
//
// NEVER import this from a Client Component. The service role key is read from
// SUPABASE_SERVICE_ROLE_KEY (server-only env).
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    throw new Error('Supabase admin client requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
