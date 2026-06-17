'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { toast } from 'sonner';
import { addComment } from '@/lib/actions/tasks';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function CommentForm({ taskId }: { taskId: string }) {
  const [state, formAction, pending] = useActionState(addComment.bind(null, taskId), null);
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!state) return;
    if (state.ok) { ref.current?.reset(); router.refresh(); }
    else toast.error(state.error);
  }, [state, router]);

  return (
    <form ref={ref} action={formAction} className="space-y-2">
      <Textarea name="body" placeholder="Add a comment…" required className="min-h-[72px]" />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>{pending ? 'Posting…' : (<><Send className="h-4 w-4" /> Comment</>)}</Button>
      </div>
    </form>
  );
}
