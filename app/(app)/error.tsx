'use client';

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** Route-group error boundary — catches render/data errors inside the app shell. */
export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[app] route error:', error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center gap-3 py-20 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-sm border border-border bg-card text-danger">
        <AlertTriangle className="h-6 w-6" />
      </span>
      <h1 className="text-h2">Something went wrong</h1>
      <p className="text-body-sm text-text-secondary">
        This page hit an unexpected error. You can try again, or head back to your dashboard.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <Button onClick={reset}><RotateCcw className="h-4 w-4" /> Try again</Button>
        <Button variant="ghost" onClick={() => { window.location.href = '/'; }}>Go to dashboard</Button>
      </div>
    </div>
  );
}
