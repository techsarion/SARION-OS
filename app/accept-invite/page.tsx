import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/admin';
import { roleLabel } from '@/lib/roles';
import { AuthCard } from '@/components/auth/auth-card';
import { AcceptForm } from '@/components/auth/accept-form';
import { buttonVariants } from '@/components/ui/button';
import type { Role } from '@/types/enums';

export const metadata = { title: 'Accept invitation — Sarion Team OS' };

function Invalid({ message }: { message: string }) {
  return (
    <AuthCard eyebrow="Sarion Team OS" title="Invitation unavailable" subtitle={message}>
      <Link href="/login" className={`${buttonVariants({ variant: 'secondary', size: 'lg' })} w-full`}>
        Go to sign in
      </Link>
    </AuthCard>
  );
}

export default async function AcceptInvitePage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) return <Invalid message="This invitation link is missing its token." />;

  // Token lookup runs through the service role — the invitee has no session yet.
  const admin = createAdminClient();
  const { data: invite } = await admin
    .from('invitations')
    .select('email, full_name, role, status, expires_at')
    .eq('token', token)
    .maybeSingle();

  if (!invite || invite.status !== 'PENDING') {
    return <Invalid message="This invitation has already been used or was revoked." />;
  }
  if (new Date(invite.expires_at).getTime() < Date.now()) {
    return <Invalid message="This invitation has expired. Ask an administrator to re-invite you." />;
  }

  return (
    <AcceptForm
      token={token}
      email={invite.email}
      fullName={invite.full_name}
      role={roleLabel(invite.role as Role)}
    />
  );
}
