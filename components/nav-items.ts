// Sidebar navigation model — PRODUCTION. Sarion Team OS is a focused execution
// OS for a small startup team. Flat, grouped list of working modules only — no
// org-hierarchy, approvals, docs, or "Soon" placeholders.
export interface NavItem {
  label: string;
  icon: string;
  href: string;
}
export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Overview',
    items: [
      { label: 'Dashboard', icon: 'layout-dashboard', href: '/' },
      { label: 'My Dashboard', icon: 'user', href: '/me' },
      { label: 'Team Pulse', icon: 'gauge', href: '/pulse' },
    ],
  },
  {
    label: 'Daily',
    items: [
      { label: 'Daily Workspace', icon: 'sunrise', href: '/check-in' },
    ],
  },
  {
    label: 'Execute',
    items: [
      { label: 'Tasks', icon: 'check-square', href: '/tasks' },
      { label: 'Meetings', icon: 'calendar', href: '/meetings' },
      { label: 'Meeting Actions', icon: 'list-checks', href: '/actions' },
    ],
  },
  {
    label: 'Sales',
    items: [
      { label: 'Lead Dashboard', icon: 'target', href: '/leads/dashboard' },
      { label: 'Leads', icon: 'contact', href: '/leads' },
      { label: 'Import Leads', icon: 'upload', href: '/leads/import' },
      { label: 'Sales Reports', icon: 'bar-chart', href: '/leads/reports' },
    ],
  },
  {
    label: 'Targets',
    items: [
      { label: 'Daily Targets', icon: 'sun', href: '/daily-targets' },
      { label: 'Weekly Targets', icon: 'calendar-range', href: '/weekly-targets' },
      { label: 'Monthly Targets', icon: 'calendar-check', href: '/monthly-targets' },
      { label: 'Team Targets', icon: 'flag', href: '/team-targets' },
      { label: 'Weekly Review', icon: 'clipboard-check', href: '/weekly-review' },
    ],
  },
  {
    label: 'Team',
    items: [
      { label: 'Activity Feed', icon: 'activity', href: '/activity' },
      { label: 'Work Timeline', icon: 'history', href: '/timeline' },
      { label: 'Team Directory', icon: 'users', href: '/directory' },
      { label: 'Settings', icon: 'settings', href: '/settings' },
    ],
  },
];
