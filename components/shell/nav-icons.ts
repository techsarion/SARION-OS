// Shared nav icon map — used by both the desktop Sidebar and the mobile drawer
// so the two stay in sync. Keys match the `icon` strings in nav-items.ts.
import {
  LayoutDashboard, User, Gauge, Sunrise, Moon, CheckSquare, Calendar, ListChecks,
  CalendarRange, CalendarCheck, ClipboardCheck, Sun, Flag, Activity, History, Users, Settings,
  type LucideIcon,
} from 'lucide-react';

export const NAV_ICONS: Record<string, LucideIcon> = {
  'layout-dashboard': LayoutDashboard,
  user: User,
  gauge: Gauge,
  sunrise: Sunrise,
  moon: Moon,
  'check-square': CheckSquare,
  calendar: Calendar,
  'list-checks': ListChecks,
  'calendar-range': CalendarRange,
  'calendar-check': CalendarCheck,
  'clipboard-check': ClipboardCheck,
  sun: Sun,
  flag: Flag,
  activity: Activity,
  history: History,
  users: Users,
  settings: Settings,
};
