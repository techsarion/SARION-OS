'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Menu, X, LayoutDashboard, LogOut } from 'lucide-react';
import { NAV_GROUPS } from '@/components/nav-items';
import { NAV_ICONS as ICONS } from '@/components/shell/nav-icons';
import { Logo } from '@/components/brand/logo';
import { signOut } from '@/lib/actions/auth';
import { cn } from '@/lib/utils';

/** Mobile navigation — hamburger trigger + slide-in drawer. Hidden on md+ where
 *  the persistent Sidebar takes over. The drawer is rendered through a PORTAL to
 *  document.body so it escapes the header's backdrop-blur stacking/containing
 *  context — otherwise a `fixed` drawer is trapped inside the 56px header and
 *  page content bleeds over it. Overlay = z-40, drawer = z-50. */
export function MobileNav({ counts = {} }: { counts?: Record<string, number> }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  // Portals need the DOM — only render the overlay after mount.
  useEffect(() => { setMounted(true); }, []);

  // Close on route change.
  useEffect(() => { setOpen(false); }, [pathname]);

  // Lock body scroll while the drawer is open.
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const drawer = (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
      <button aria-label="Close navigation menu" onClick={() => setOpen(false)} className="absolute inset-0 z-40 bg-black/60" />
      <div
        className="absolute left-0 top-0 z-50 flex h-full w-[280px] max-w-[85vw] flex-col border-r border-border bg-surface-2 shadow-e2"
        style={{ paddingTop: 'env(safe-area-inset-top)', paddingLeft: 'env(safe-area-inset-left)' }}
      >
        <div className="flex h-14 items-center justify-between px-4">
          <Link href="/" aria-label="Sarion home"><Logo wordmark size={26} /></Link>
          <button onClick={() => setOpen(false)} aria-label="Close navigation menu" className="grid h-9 w-9 place-items-center rounded-sm text-text-secondary hover:bg-white/[0.05] hover:text-text">
            <X className="h-5 w-5" />
          </button>
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
          {NAV_GROUPS.map((group) => (
            <div key={group.label}>
              <div className="px-2 pb-1.5 text-overline uppercase text-text-muted">{group.label}</div>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? LayoutDashboard;
                  const active = item.href === '/' ? pathname === '/' : pathname.startsWith(item.href);
                  const count = counts[item.href];
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      aria-current={active ? 'page' : undefined}
                      className={cn(
                        'flex items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-body-sm transition-colors',
                        active ? 'bg-accent-soft text-text' : 'text-text-secondary hover:bg-white/[0.04] hover:text-text',
                      )}
                    >
                      <Icon className={cn('h-[18px] w-[18px] shrink-0', active && 'text-accent')} strokeWidth={2} />
                      <span className="flex-1 truncate">{item.label}</span>
                      {count != null && count > 0 && (
                        <span className="rounded-sm bg-white/[0.06] px-1.5 text-[11px] font-medium tabular-nums text-text-secondary">{count}</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
        <div className="border-t border-border p-2" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
          <form action={signOut}>
            <button
              type="submit"
              className="flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2.5 text-body-sm text-text-secondary transition-colors hover:bg-danger-soft hover:text-danger"
            >
              <LogOut className="h-[18px] w-[18px]" /> Sign out
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Open navigation menu"
        aria-expanded={open}
        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text md:hidden"
      >
        <Menu className="h-5 w-5" />
      </button>

      {mounted && open && createPortal(drawer, document.body)}
    </>
  );
}
