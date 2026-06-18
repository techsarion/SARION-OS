'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, Settings, LogOut } from 'lucide-react';
import { Avatar } from '@/components/ui/misc';
import { signOut } from '@/lib/actions/auth';

export function UserMenu({
  userName,
  userRole,
  avatarUrl,
  accountHref = '/settings',
}: {
  userName: string;
  userRole: string;
  avatarUrl?: string | null;
  accountHref?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-label="Account menu"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-sm py-1 pl-1 pr-1.5 transition-colors duration-fast hover:bg-white/[0.05]"
      >
        <Avatar name={userName} src={avatarUrl} size={26} />
        <div className="hidden text-left leading-tight lg:block">
          <div className="text-caption font-medium text-text">{userName}</div>
          <div className="text-[11px] text-text-muted">{userRole}</div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-30 w-[220px] rounded-sm border border-border-strong bg-card py-1 shadow-e2">
          <div className="border-b border-border px-3 py-2">
            <p className="truncate text-body-sm font-medium text-text">{userName}</p>
            <p className="truncate text-caption text-text-muted">{userRole}</p>
          </div>
          <Link
            href={accountHref}
            onClick={() => setOpen(false)}
            className="flex items-center gap-2.5 px-3 py-2 text-body-sm text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text"
          >
            <Settings className="h-4 w-4 text-text-muted" /> Settings
          </Link>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-body-sm text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
