'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { toggleWatch } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';

export function WatchButton({ taskId, watching }: { taskId: string; watching: boolean }) {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await toggleWatch(taskId, watching);
          if (res.ok) { toast.success(watching ? 'Stopped watching' : 'Watching this task'); router.refresh(); }
          else toast.error(res.error);
        })
      }
    >
      {watching ? <><EyeOff className="h-4 w-4" /> Unwatch</> : <><Eye className="h-4 w-4" /> Watch</>}
    </Button>
  );
}
