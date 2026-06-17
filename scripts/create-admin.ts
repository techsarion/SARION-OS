/**
 * Bootstrap the first administrator (role SUPER_ADMIN).
 *
 * This is the ONE account that can't be created in-app — Create Account / Invite
 * both require an existing admin. Run it once after the migrations are applied
 * (`npm run db:push`), then sign in at /login and provision everyone else.
 *
 * Usage:
 *   npm run create-admin -- you@company.com "Your Name" "your-password"
 *
 * It reads NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY from .env and
 * uses the service role (RLS-bypassing) to create the auth user + profile row.
 * Safe to re-run: it no-ops if a profile with that email already exists.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';

// ── tiny .env loader (standalone scripts don't get Next's env injection) ──────
function loadEnv(): Record<string, string> {
  const env: Record<string, string> = { ...process.env } as Record<string, string>;
  for (const file of ['.env.local', '.env']) {
    try {
      const text = readFileSync(join(process.cwd(), file), 'utf8');
      for (const raw of text.split('\n')) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        const eq = line.indexOf('=');
        if (eq === -1) continue;
        const key = line.slice(0, eq).trim();
        let val = line.slice(eq + 1).trim();
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (env[key] === undefined || env[key] === '') env[key] = val;
      }
    } catch {
      /* file optional */
    }
  }
  return env;
}

function die(msg: string): never {
  console.error(`\n✖ ${msg}\n`);
  process.exit(1);
}

async function main() {
  const [email, fullName, password] = process.argv.slice(2);
  if (!email || !fullName || !password) {
    die('Usage: npm run create-admin -- <email> "<Full Name>" "<password>"');
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) die(`"${email}" is not a valid email.`);
  if (password.length < 8) die('Password must be at least 8 characters.');

  const env = loadEnv();
  const url = env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    die('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.');
  }

  const supabase = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
  const lower = email.toLowerCase();

  // Idempotency: bail if this person already has a profile.
  const { data: existing, error: existErr } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('email', lower)
    .maybeSingle();
  if (existErr && !/relation .* does not exist/i.test(existErr.message)) {
    die(`Could not read profiles: ${existErr.message}\nDid you run the migrations? (npm run db:push)`);
  }
  if (existErr && /does not exist/i.test(existErr.message)) {
    die('The "profiles" table does not exist yet. Apply the migrations first: npm run db:push');
  }
  if (existing) {
    console.log(`\n✓ A profile for ${lower} already exists (role ${existing.role}). Nothing to do.\n`);
    return;
  }

  // 1. Create the auth user (pre-confirmed).
  const { data: created, error: createErr } = await supabase.auth.admin.createUser({
    email: lower,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (createErr || !created.user) {
    die(`Could not create the auth user: ${createErr?.message ?? 'unknown error'}`);
  }

  // 2. Insert the SUPER_ADMIN profile.
  const profile = {
    id: created.user.id,
    employee_code: `EMP-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    full_name: fullName,
    email: lower,
    role: 'SUPER_ADMIN',
    status: 'ACTIVE',
    join_date: new Date().toISOString().slice(0, 10),
  };
  const { error: profileErr } = await supabase.from('profiles').insert(profile);
  if (profileErr) {
    // Roll back the orphaned auth user so the script can be retried cleanly.
    await supabase.auth.admin.deleteUser(created.user.id);
    die(`Created the auth user but failed to insert the profile (rolled back): ${profileErr.message}`);
  }

  console.log(`\n✓ Admin created.\n  Email: ${lower}\n  Role:  SUPER_ADMIN\n  ID:    ${created.user.id}\n\nSign in at /login, then provision your team from Employees → Create account.\n`);
}

main().catch((err) => die(err instanceof Error ? err.message : String(err)));
