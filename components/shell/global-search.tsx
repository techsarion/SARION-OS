'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, CheckSquare, UserRound, Building2, Users, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Kbd } from '@/components/ui/misc';

interface Result { id: string; label: string; sub: string; href: string; group: string; icon: typeof Search }

export function GlobalSearch() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // ⌘K / Ctrl+K focuses search.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Close when clicking outside.
  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  // Debounced live query against Supabase (RLS-scoped).
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;
      const [people, tasks, depts, teams] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, designation').or(`full_name.ilike.${like},email.ilike.${like}`).limit(5),
        supabase.from('tasks').select('id, title, status').ilike('title', like).is('deleted_at', null).limit(5),
        supabase.from('departments').select('id, name').ilike('name', like).is('deleted_at', null).limit(4),
        supabase.from('teams').select('id, name').ilike('name', like).limit(4),
      ]);
      const out: Result[] = [];
      for (const p of (people.data ?? []) as { id: string; full_name: string; email: string; designation: string | null }[]) {
        out.push({ id: `p-${p.id}`, label: p.full_name, sub: p.designation ?? p.email, href: `/employees/${p.id}`, group: 'People', icon: UserRound });
      }
      for (const t of (tasks.data ?? []) as { id: string; title: string; status: string }[]) {
        out.push({ id: `t-${t.id}`, label: t.title, sub: `Task · ${t.status.replace('_', ' ').toLowerCase()}`, href: `/tasks/${t.id}`, group: 'Tasks', icon: CheckSquare });
      }
      for (const d of (depts.data ?? []) as { id: string; name: string }[]) {
        out.push({ id: `d-${d.id}`, label: d.name, sub: 'Department', href: `/departments/${d.id}/edit`, group: 'Departments', icon: Building2 });
      }
      for (const tm of (teams.data ?? []) as { id: string; name: string }[]) {
        out.push({ id: `tm-${tm.id}`, label: tm.name, sub: 'Team', href: `/teams/${tm.id}/edit`, group: 'Teams', icon: Users });
      }
      setResults(out);
      setActive(0);
      setLoading(false);
      setOpen(true);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  const go = (r: Result) => { setOpen(false); setQ(''); router.push(r.href); };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) go(r); }
  };

  return (
    <div ref={boxRef} className="relative w-full max-w-[420px]">
      <div className="flex h-9 items-center gap-2.5 rounded-sm border border-border-strong bg-surface-2 px-3 text-body-sm transition-colors focus-within:border-accent">
        <Search className="h-4 w-4 text-text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search people, tasks, departments…"
          className="flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
          aria-label="Search"
        />
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" /> : <Kbd>⌘K</Kbd>}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-[60vh] overflow-y-auto rounded-sm border border-border-strong bg-card shadow-e2">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-caption text-text-muted">{loading ? 'Searching…' : `No matches for “${q}”`}</p>
          ) : (
            results.map((r, i) => (
              <button
                key={r.id}
                onMouseEnter={() => setActive(i)}
                onClick={() => go(r)}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors ${i === active ? 'bg-accent-soft' : 'hover:bg-white/[0.03]'}`}
              >
                <r.icon className="h-4 w-4 shrink-0 text-text-muted" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-body-sm text-text">{r.label}</span>
                  <span className="block truncate text-caption text-text-muted">{r.sub}</span>
                </span>
                <span className="text-[11px] text-text-muted">{r.group}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
