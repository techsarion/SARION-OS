'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Bell, AlertTriangle, Clock, Inbox, Sparkles, CalendarClock, Target, Contact } from 'lucide-react';
import type { NotificationItem } from '@/lib/server/data/workspace';

const ICON = { overdue: AlertTriangle, due_soon: Clock, review: Inbox, reminder: Sparkles, meeting: CalendarClock, target: Target, lead: Contact } as const;
const TONE = { overdue: 'text-danger', due_soon: 'text-warning', review: 'text-accent', reminder: 'text-info', meeting: 'text-accent', target: 'text-warning', lead: 'text-accent' } as const;

export function NotificationsBell({ items }: { items: NotificationItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Ask once for browser-notification permission (only if not yet decided).
  useEffect(() => {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // Fire a native browser notification for items we haven't shown before
  // (while the app is open). Seen ids persist in localStorage across reloads.
  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    let seen: string[];
    try { seen = JSON.parse(localStorage.getItem('notif-seen') ?? '[]'); } catch { seen = []; }
    const seenSet = new Set(seen);
    const fresh = items.filter((n) => !seenSet.has(`${n.kind}-${n.id}`));
    for (const n of fresh.slice(0, 5)) {
      const note = new Notification(n.title, { body: n.detail, tag: `${n.kind}-${n.id}`, icon: '/SARION-ICON.png' });
      note.onclick = () => { window.focus(); window.location.href = n.href; };
    }
    const nextSeen = items.map((n) => `${n.kind}-${n.id}`);
    try { localStorage.setItem('notif-seen', JSON.stringify(nextSeen.slice(0, 200))); } catch { /* ignore */ }
  }, [items]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative grid h-7 w-7 place-items-center rounded-sm text-text-secondary transition-colors duration-fast hover:bg-white/[0.05] hover:text-text"
        aria-label={`Notifications${count ? ` (${count})` : ''}`}
      >
        <Bell className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-[16px] place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold text-white ring-2 ring-surface">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-9 z-30 w-[320px] rounded-sm border border-border-strong bg-card shadow-e2">
          <div className="flex items-center justify-between border-b border-border px-3 py-2">
            <span className="text-body-sm font-medium text-text">Notifications</span>
            <span className="text-caption text-text-muted">{count} need attention</span>
          </div>
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-caption text-text-muted">You're all caught up.</p>
          ) : (
            <ul className="max-h-[60vh] divide-y divide-border overflow-y-auto">
              {items.map((n) => {
                const Icon = ICON[n.kind];
                return (
                  <li key={`${n.kind}-${n.id}`}>
                    <Link href={n.href} onClick={() => setOpen(false)} className="flex items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-white/[0.03]">
                      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${TONE[n.kind]}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-body-sm text-text">{n.title}</span>
                        <span className="block text-caption text-text-muted">{n.detail}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/tasks" onClick={() => setOpen(false)} className="block border-t border-border px-3 py-2 text-center text-caption text-accent hover:text-accent-hover">
            View all tasks
          </Link>
        </div>
      )}
    </div>
  );
}
