'use client';
// App-wide toast surface (Sonner) — dark-enterprise styled to match the OS.
// Mounted once in the authenticated layout. Trigger from any client component:
//   import { toast } from 'sonner';
//   toast.success('Task created'); toast.error(res.error);
import { Toaster as SonnerToaster } from 'sonner';

export function Toaster() {
  return (
    <SonnerToaster
      position="bottom-right"
      theme="dark"
      gap={8}
      toastOptions={{
        style: {
          background: 'var(--card)',
          border: '1px solid var(--border-strong)',
          color: 'var(--text)',
          borderRadius: '2px',
          fontSize: '13px',
        },
        classNames: {
          description: 'text-text-secondary',
        },
      }}
    />
  );
}
