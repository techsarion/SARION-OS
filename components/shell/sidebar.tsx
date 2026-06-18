'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PanelLeftClose, PanelLeftOpen, LayoutDashboard } from 'lucide-react';
import { NAV_GROUPS } from '@/components/nav-items';
import { NAV_ICONS as ICONS } from '@/components/shell/nav-icons';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/utils';

export function Sidebar({
  collapsed,
  onToggle,
  counts = {},
}: {
  collapsed: boolean;
  onToggle: () => void;
  counts?: Record<string, number>;
}) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        'sticky top-0 hidden h-screen shrink-0 flex-col border-r border-border bg-surface-2 transition-[width] duration-base ease-out md:flex',
        collapsed ? 'w-[68px]' : 'w-[252px]',
      )}
    >
      {/* Brand */}
      <div className="flex h-14 items-center px-4">
        <Link href="/" aria-label="Sarion home" className="overflow-hidden">
          <Logo wordmark={!collapsed} size={26} />
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-3">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            {!collapsed && (
              <div className="px-2 pb-1.5 text-overline uppercase text-text-muted">
                {group.label}
              </div>
            )}
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active =
                  item.href === '/'
                    ? pathname === '/'
                    : pathname.startsWith(item.href);
                const count = counts[item.href];

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.label : undefined}
                    aria-current={active ? 'page' : undefined}
                    className={cn(
                      'group relative flex items-center gap-2.5 rounded-sm px-2.5 py-[7px] text-body-sm transition-colors duration-fast',
                      active
                        ? 'bg-accent-soft text-text'
                        : 'text-text-secondary hover:bg-white/[0.04] hover:text-text',
                      collapsed && 'justify-center px-0',
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-accent" />
                    )}
                    <Icon
                      className={cn('h-[18px] w-[18px] shrink-0', active && 'text-accent')}
                      strokeWidth={2}
                    />
                    {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                    {!collapsed && count != null && count > 0 && (
                      <span className="rounded-sm bg-white/[0.06] px-1.5 text-[11px] font-medium tabular-nums text-text-secondary">
                        {count}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer: collapse control */}
      <div className="border-t border-border p-2">
        <button
          onClick={onToggle}
          className={cn(
            'flex w-full items-center gap-2.5 rounded-sm px-2.5 py-2 text-body-sm text-text-secondary transition-colors duration-fast hover:bg-white/[0.04] hover:text-text',
            collapsed && 'justify-center px-0',
          )}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-[18px] w-[18px]" />
          ) : (
            <>
              <PanelLeftClose className="h-[18px] w-[18px]" />
              <span>Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
