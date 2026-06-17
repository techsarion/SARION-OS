'use client';

import { useTransition } from 'react';
import { BellRing } from 'lucide-react';
import { toast } from 'sonner';
import { notifyOverdueTasks } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';

/** Admin trigger for the overdue sweep — emails every assignee with an open,
 *  past-due task. Also callable from a cron/route for automation. */
export function OverdueSweepButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="secondary"
      size="md"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await notifyOverdueTasks();
          if (res.ok) toast.success(`Overdue reminders sent: ${res.notified}`);
          else toast.error(res.error);
        })
      }
    >
      <BellRing className="h-4 w-4" /> Notify overdue
    </Button>
  );
}
