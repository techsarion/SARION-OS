'use client';

import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { Avatar } from '@/components/ui/misc';
import { GlobalSearch } from '@/components/shell/global-search';
import { QuickMenu, type QuickPerms } from '@/components/shell/quick-menu';
import { NotificationsBell } from '@/components/shell/notifications-bell';
import { MobileNav } from '@/components/shell/mobile-nav';
import type { NotificationItem } from '@/lib/server/data/workspace';

export function Topbar({
  userName = 'Sarion Owner',
  userRole = 'Owner',
  avatarUrl,
  accountHref,
  notifications = [],
  quickPerms,
  navCounts,
}: {
  userName?: string;
  userRole?: string;
  avatarUrl?: string | null;
  accountHref?: string;
  notifications?: NotificationItem[];
  quickPerms?: QuickPerms;
  navCounts?: Record<string, number>;
}) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border bg-surface/80 px-4 backdrop-blur-md">
      <MobileNav counts={navCounts} />
      <GlobalSearch />

      <div className="ml-auto flex items-center gap-1.5">
        {quickPerms && <QuickMenu perms={quickPerms} />}
        <NotificationsBell items={notifications} />

        <div className="mx-1 h-6 w-px bg-border" />

        <Link
          href={accountHref ?? '#'}
          title="Your account & password"
          className="flex items-center gap-2 rounded-sm py-1 pl-1 pr-1.5 transition-colors duration-fast hover:bg-white/[0.05]"
        >
          <Avatar name={userName} src={avatarUrl} size={26} />
          <div className="hidden text-left leading-tight lg:block">
            <div className="text-caption font-medium text-text">{userName}</div>
            <div className="text-[11px] text-text-muted">{userRole}</div>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-text-muted" />
        </Link>
      </div>
    </header>
  );
}
