'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { ActionResult } from '@/lib/actions/result';

/** Generic confirm-and-delete button wired to any (id) => ActionResult action. */
export function DeleteButton({
  id,
  action,
  label,
  confirmText,
}: {
  id: string;
  action: (id: string) => Promise<ActionResult>;
  label: string;
  confirmText: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-label={label}
      disabled={pending}
      onClick={() => {
        if (!window.confirm(confirmText)) return;
        start(async () => {
          const res = await action(id);
          if (res.ok) {
            toast.success(`${label} done`);
            router.refresh();
          } else {
            toast.error(res.error);
          }
        });
      }}
    >
      <Trash2 className="h-4 w-4 text-text-muted hover:text-danger" />
    </Button>
  );
}
