'use client';

import { GlobalSearch } from '@/components/shell/global-search';
import { QuickMenu, type QuickPerms } from '@/components/shell/quick-menu';
import { NotificationsBell } from '@/components/shell/notifications-bell';
import { MobileNav } from '@/components/shell/mobile-nav';
import { UserMenu } from '@/components/shell/user-menu';
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

        <UserMenu userName={userName} userRole={userRole} avatarUrl={avatarUrl} accountHref={accountHref} />
      </div>
    </header>
  );
}
