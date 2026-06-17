'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { deleteTask } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';

export function TaskDeleteButton({ taskId, title }: { taskId: string; title: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(`Delete “${title}”? It can be restored by an admin.`)) return;
        start(async () => {
          const res = await deleteTask(taskId);
          if (res.ok) { toast.success('Task deleted'); router.push('/tasks'); }
          else toast.error(res.error);
        });
      }}
    >
      <Trash2 className="h-4 w-4" /> Delete
    </Button>
  );
}
