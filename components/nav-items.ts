// Sidebar navigation model — PRODUCTION. Only modules that are fully
// operational (DB + server actions + permissions + UI + workflow) appear here.
// Unbuilt modules are intentionally absent (no "Soon"/disabled items).
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
    items: [{ label: 'Dashboard', icon: 'layout-dashboard', href: '/' }],
  },
  {
    label: 'Work',
    items: [{ label: 'Tasks', icon: 'check-square', href: '/tasks' }],
  },
  {
    label: 'Organisation',
    items: [
      { label: 'Departments', icon: 'building-2', href: '/departments' },
      { label: 'Teams', icon: 'users', href: '/teams' },
      { label: 'Employees', icon: 'user-round', href: '/employees' },
    ],
  },
];
