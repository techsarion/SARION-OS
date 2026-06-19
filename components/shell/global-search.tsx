'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Search, CheckSquare, UserRound, Loader2, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { Kbd } from '@/components/ui/misc';

interface Result { id: string; label: string; sub: string; href: string; group: string; icon: typeof Search }

/** Shared debounced entity search (people + tasks, RLS-scoped). Powers both the
 *  desktop inline box and the mobile full-screen modal. */
function useEntitySearch() {
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Result[]>([]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      const supabase = createClient();
      const like = `%${term}%`;
      const [people, tasks] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, designation').or(`full_name.ilike.${like},email.ilike.${like}`).limit(6),
        supabase.from('tasks').select('id, title, status').ilike('title', like).is('deleted_at', null).limit(6),
      ]);
      const out: Result[] = [];
      for (const p of (people.data ?? []) as { id: string; full_name: string; email: string; designation: string | null }[]) {
        out.push({ id: `p-${p.id}`, label: p.full_name, sub: p.designation ?? p.email, href: `/employees/${p.id}`, group: 'People', icon: UserRound });
      }
      for (const t of (tasks.data ?? []) as { id: string; title: string; status: string }[]) {
        out.push({ id: `t-${t.id}`, label: t.title, sub: `Task · ${t.status.replace('_', ' ').toLowerCase()}`, href: `/tasks/${t.id}`, group: 'Tasks', icon: CheckSquare });
      }
      setResults(out);
      setLoading(false);
    }, 220);
    return () => clearTimeout(handle);
  }, [q]);

  return { q, setQ, loading, results };
}

function ResultRow({ r, active, onEnter, onClick }: { r: Result; active: boolean; onEnter: () => void; onClick: () => void }) {
  return (
    <button
      onMouseEnter={onEnter}
      onClick={onClick}
      className={`flex w-full items-center gap-3 px-3 py-2.5 text-left transition-colors ${active ? 'bg-accent-soft' : 'hover:bg-white/[0.03]'}`}
    >
      <r.icon className="h-4 w-4 shrink-0 text-text-muted" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body-sm text-text">{r.label}</span>
        <span className="block truncate text-caption text-text-muted">{r.sub}</span>
      </span>
      <span className="shrink-0 text-[11px] text-text-muted">{r.group}</span>
    </button>
  );
}

/** Desktop inline search box. Hidden below md — the mobile header uses MobileSearch. */
export function GlobalSearch() {
  const { q, setQ, loading, results } = useEntitySearch();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => { setActive(0); if (results.length) setOpen(true); }, [results]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); inputRef.current?.focus(); }
      if (e.key === 'Escape') { setOpen(false); inputRef.current?.blur(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const go = (r: Result) => { setOpen(false); setQ(''); router.push(r.href); };
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!open || results.length === 0) return;
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); const r = results[active]; if (r) go(r); }
  };

  return (
    <div ref={boxRef} className="relative hidden w-full max-w-[420px] md:block">
      <div className="flex h-9 items-center gap-2.5 rounded-sm border border-border-strong bg-surface-2 px-3 text-body-sm transition-colors focus-within:border-accent">
        <Search className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { if (results.length) setOpen(true); }}
          onKeyDown={onKeyDown}
          placeholder="Search people and tasks…"
          className="min-w-0 flex-1 bg-transparent text-text outline-none placeholder:text-text-muted"
          aria-label="Search"
        />
        {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin text-text-muted" /> : <Kbd>⌘K</Kbd>}
      </div>

      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-11 z-30 max-h-[60vh] overflow-y-auto rounded-sm border border-border-strong bg-card shadow-e2">
          {results.length === 0 ? (
            <p className="px-3 py-4 text-center text-caption text-text-muted">{loading ? 'Searching…' : `No matches for “${q}”`}</p>
          ) : (
            results.map((r, i) => <ResultRow key={r.id} r={r} active={i === active} onEnter={() => setActive(i)} onClick={() => go(r)} />)
          )}
        </div>
      )}
    </div>
  );
}

/** Mobile search: an icon button in the header that opens a full-screen modal,
 *  portaled to body so it escapes the header's backdrop-blur stacking context. */
export function MobileSearch() {
  const { q, setQ, loading, results } = useEntitySearch();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => { setMounted(true); }, []);
  useEffect(() => {
    if (open) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      setTimeout(() => inputRef.current?.focus(), 50);
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const go = (r: Result) => { setOpen(false); setQ(''); router.push(r.href); };

  const modal = (
    <div className="fixed inset-0 z-50 flex flex-col bg-bg md:hidden" role="dialog" aria-modal="true" aria-label="Search">
      <div className="flex h-14 items-center gap-2 border-b border-border px-3" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <Search className="h-4 w-4 shrink-0 text-text-muted" />
        <input
          ref={inputRef}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search people and tasks…"
          className="min-w-0 flex-1 bg-transparent text-body text-text outline-none placeholder:text-text-muted"
          aria-label="Search"
        />
        {loading && <Loader2 className="h-4 w-4 shrink-0 animate-spin text-text-muted" />}
        <button onClick={() => { setOpen(false); setQ(''); }} aria-label="Close search" className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-text-secondary hover:bg-white/[0.05] hover:text-text">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {q.trim().length < 2 ? (
          <p className="px-4 py-6 text-center text-caption text-text-muted">Type at least 2 characters to search.</p>
        ) : results.length === 0 ? (
          <p className="px-4 py-6 text-center text-caption text-text-muted">{loading ? 'Searching…' : `No matches for “${q}”`}</p>
        ) : (
          results.map((r) => <ResultRow key={r.id} r={r} active={false} onEnter={() => {}} onClick={() => go(r)} />)
        )}
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="Search"
        className="grid h-9 w-9 shrink-0 place-items-center rounded-sm text-text-secondary transition-colors hover:bg-white/[0.05] hover:text-text md:hidden"
      >
        <Search className="h-[18px] w-[18px]" />
      </button>
      {mounted && open && createPortal(modal, document.body)}
    </>
  );
}
