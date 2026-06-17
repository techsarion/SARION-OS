'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Plus, CheckSquare, UserRoundPlus, Building2, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

export interface QuickPerms { task: boolean; account: boolean; dept: boolean; team: boolean }

export function QuickMenu({ perms }: { perms: QuickPerms }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const items = [
    perms.task && { href: '/tasks/new', label: 'New task', icon: CheckSquare },
    perms.account && { href: '/employees/new', label: 'Create account', icon: UserRoundPlus },
    perms.dept && { href: '/departments/new', label: 'New department', icon: Building2 },
    perms.team && { href: '/teams/new', label: 'New team', icon: Users },
  ].filter(Boolean) as { href: string; label: string; icon: typeof CheckSquare }[];

  if (items.length === 0) return null;

  return (
    <div ref={ref} className="relative">
      <Button variant="secondary" size="sm" className="hidden sm:inline-flex" onClick={() => setOpen((o) => !o)}>
        <Plus className="h-4 w-4" /> Quick
      </Button>
      {open && (
        <div className="absolute right-0 top-9 z-30 w-[200px] rounded-sm border border-border-strong bg-card py-1 shadow-e2">
          {items.map((it) => (
            <Link key={it.href} href={it.href} onClick={() => setOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-body-sm text-text-secondary transition-colors hover:bg-white/[0.04] hover:text-text">
              <it.icon className="h-4 w-4 text-text-muted" /> {it.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
