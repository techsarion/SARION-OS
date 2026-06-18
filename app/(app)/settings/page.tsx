import { requireUser } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SelfProfileForm } from '@/components/people/self-profile-form';
import { ChangePasswordForm } from '@/components/people/change-password-form';
import { AvatarUpload } from '@/components/people/avatar-upload';

export default async function SettingsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, phone, designation, skills, avatar_url')
    .eq('id', user.id)
    .maybeSingle<{ full_name: string; phone: string | null; designation: string | null; skills: string[]; avatar_url: string | null }>();

  return (
    <div className="mx-auto max-w-[800px] space-y-5">
      <PageHeader title="Settings" subtitle="Manage your profile and account" />

      <Card>
        <CardHeader><CardTitle>Profile photo</CardTitle></CardHeader>
        <CardContent>
          <AvatarUpload userId={user.id} name={profile?.full_name ?? user.fullName} currentUrl={profile?.avatar_url ?? null} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Your profile</CardTitle></CardHeader>
        <CardContent>
          <SelfProfileForm
            defaults={{
              full_name: profile?.full_name ?? user.fullName,
              phone: profile?.phone ?? null,
              designation: profile?.designation ?? null,
              skills: profile?.skills ?? [],
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Password</CardTitle></CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
    </div>
  );
}
