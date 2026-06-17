'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { updateOwnProfile } from '@/lib/actions/employees';
import { Button } from '@/components/ui/button';
import { Input, Label } from '@/components/ui/input';
import { FieldError } from '@/components/ui/textarea';

interface Defaults { full_name: string; phone: string | null; designation: string | null; skills: string[] }

export function SelfProfileForm({ defaults }: { defaults: Defaults }) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, null);
  const router = useRouter();

  useEffect(() => {
    if (!state) return;
    if (state.ok) {
      toast.success('Profile updated');
      router.refresh();
    } else if (!state.fieldErrors) {
      toast.error(state.error);
    }
  }, [state, router]);

  const fe = state && !state.ok ? state.fieldErrors : undefined;

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input id="full_name" name="full_name" defaultValue={defaults.full_name} required />
          <FieldError messages={fe?.full_name} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" defaultValue={defaults.phone ?? ''} placeholder="Optional" />
          <FieldError messages={fe?.phone} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="designation">Designation</Label>
        <Input id="designation" name="designation" defaultValue={defaults.designation ?? ''} placeholder="e.g. Product Designer" />
        <FieldError messages={fe?.designation} />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="skills">Skills</Label>
        <Input id="skills" name="skills" defaultValue={defaults.skills.join(', ')} placeholder="Comma-separated, e.g. React, SQL, Figma" />
        <p className="text-caption text-text-muted">Separate skills with commas.</p>
      </div>
      <Button type="submit" disabled={pending}>{pending ? 'Saving…' : 'Save profile'}</Button>
    </form>
  );
}
