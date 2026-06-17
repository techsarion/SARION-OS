'use client';

import { useEffect, useState } from 'react';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { InsightsPanel } from './insights-panel';
import type { QuickPerms } from '@/components/shell/quick-menu';
import type { NotificationItem, ActivityFeedItem } from '@/lib/server/data/workspace';

const STORAGE_KEY = 'sarion:sidebar-collapsed';

export function AppShell({
  children,
  userName,
  userRole,
  accountHref,
  notifications = [],
  quickPerms,
  navCounts,
  recentActivity = [],
  showInsights = true,
}: {
  children: React.ReactNode;
  userName?: string;
  userRole?: string;
  accountHref?: string;
  notifications?: NotificationItem[];
  quickPerms?: QuickPerms;
  navCounts?: Record<string, number>;
  recentActivity?: ActivityFeedItem[];
  showInsights?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setCollapsed(saved === '1');
  }, []);

  const toggle = () => {
    setCollapsed((c) => {
      localStorage.setItem(STORAGE_KEY, c ? '0' : '1');
      return !c;
    });
  };

  return (
    <div className="flex min-h-screen bg-bg">
      <Sidebar collapsed={collapsed} onToggle={toggle} counts={navCounts} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar userName={userName} userRole={userRole} accountHref={accountHref} notifications={notifications} quickPerms={quickPerms} />
        <main className="flex-1 overflow-x-hidden px-5 py-5 lg:px-7 lg:py-6">{children}</main>
      </div>
      {showInsights && <InsightsPanel notifications={notifications} recentActivity={recentActivity} />}
    </div>
  );
}
