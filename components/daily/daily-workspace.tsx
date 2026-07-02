'use client';
// Daily Execution Workspace — the single screen every teammate starts and ends
// the day on. Renders the to-do list (drag-ordered, quick-add, per-task state),
// focus, top-3 priorities, blockers, live progress notes, the team-today board,
// smart insights, quick actions, and the "Finish My Day" end-of-day flow.
import { useState, useTransition, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  Plus, GripVertical, Circle, CircleDot, Ban, CheckCircle2, XCircle, Trash2, ArrowRight,
  StickyNote, CalendarPlus, ListChecks, UserPlus, Upload, Flame, ChevronRight, AlertTriangle,
  Clock, CornerUpRight, Sparkles, Moon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { STATE_META, PRIORITY_META, PRIORITY_ORDER, CATEGORIES, MAX_PRIORITIES } from '@/lib/daily/constants';
import { DailyTaskState } from '@/types/enums';
import type { WorkspaceData, WsTask, AutoItem } from '@/lib/server/data/daily-workspace';
import {
  saveWorkspaceMeta, addTask, pullAutoItem, setTaskState, deleteTask, reorderTasks,
  addNote, carryTask, finishDay, type CarryAction,
} from '@/lib/actions/daily-workspace';

const STATE_ICONS: Record<string, typeof Circle> = {
  NOT_STARTED: Circle, IN_PROGRESS: CircleDot, BLOCKED: Ban, COMPLETED: CheckCircle2, CANCELLED: XCircle,
};

export function DailyWorkspace({ data, userName }: { data: WorkspaceData; userName: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [tasks, setTasks] = useState<WsTask[]>(data.tasks);
  const [finishing, setFinishing] = useState(false);
  const addRef = useRef<HTMLInputElement>(null);
  const noteRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { setTasks(data.tasks); }, [data.tasks]);

  const run = (p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) =>
    start(async () => {
      const res = await p;
      if (res.ok) { if (okMsg) toast.success(okMsg); router.refresh(); }
      else toast.error(res.error ?? 'Something went wrong.');
    });

  const active = tasks.filter((t) => t.state !== DailyTaskState.CANCELLED);
  const done = active.filter((t) => t.state === DailyTaskState.COMPLETED).length;
  const percent = active.length ? Math.round((done / active.length) * 100) : 0;
  const carried = tasks.filter((t) => t.source === 'CARRYOVER' || t.carriedFromDate);
  const todays = tasks.filter((t) => t.source !== 'CARRYOVER' && !t.carriedFromDate);
  const incomplete = active.filter((t) => t.state !== DailyTaskState.COMPLETED);

  return (
    <div className="space-y-4 pb-24 sm:pb-6">
      <Greeting name={userName} date={data.date} percent={percent} done={done} total={active.length} streak={data.streak} />

      <SmartInsights insights={data.insights} carriedCount={carried.length} />

      <QuickActions onNewTask={() => addRef.current?.focus()} onAddNote={() => noteRef.current?.focus()} />

      {/* SECTION 1 — To-do list */}
      <Card>
        <CardContent className="space-y-3">
          <SectionTitle>Today&apos;s to-do list</SectionTitle>

          {carried.length > 0 && (
            <div className="rounded-sm border border-warning/40 bg-warning-soft/20 p-2">
              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-caption font-medium text-warning">
                <CornerUpRight className="h-3.5 w-3.5" /> Carried over from a previous day
              </p>
              <TaskGroup tasks={carried} pending={pending} tasksState={tasks} setTasks={setTasks} run={run} highlight />
            </div>
          )}

          <TaskGroup tasks={todays} pending={pending} tasksState={tasks} setTasks={setTasks} run={run} />

          <AddTaskInline inputRef={addRef} pending={pending} onAdd={(input) => run(addTask(input), 'Task added')} />

          {data.autoItems.length > 0 && <AutoItems items={data.autoItems} pending={pending} run={run} />}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <FocusCard focus={data.workspace?.focus ?? ''} pending={pending}
          onSave={(v) => run(saveWorkspaceMeta({ focus: v }))} />
        <PrioritiesCard priorities={data.workspace?.priorities ?? []} pending={pending}
          onSave={(v) => run(saveWorkspaceMeta({ priorities: v }), 'Priorities saved')} />
        <BlockersCard blockers={data.workspace?.blockers ?? ''} pending={pending}
          onSave={(v) => run(saveWorkspaceMeta({ blockers: v }))} />
        <ProgressNotesCard notes={data.notes} noteRef={noteRef} pending={pending}
          onAdd={(v) => run(addNote(v), 'Note added')} />
      </div>

      {/* SECTION 6 — Team today */}
      <TeamToday team={data.team} />

      {/* Finish My Day */}
      <div className="flex justify-end">
        {data.workspace?.finishedAt ? (
          <Badge tone="success"><CheckCircle2 className="mr-1 h-3.5 w-3.5" /> Day finished</Badge>
        ) : (
          <Button onClick={() => setFinishing(true)}><Moon className="h-4 w-4" /> Finish my day</Button>
        )}
      </div>

      {finishing && (
        <FinishDayDialog
          incomplete={incomplete}
          summary={{ done, total: active.length, meetings: data.finishSummary.meetingsCompleted, targets: data.finishSummary.targetsCompleted }}
          onClose={() => setFinishing(false)}
          onSubmit={(input) => { setFinishing(false); run(finishDay(input), 'Day wrapped up — nice work!'); }}
        />
      )}

      {/* Mobile sticky progress bar */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 px-4 py-2 backdrop-blur sm:hidden">
        <div className="mb-1 flex justify-between text-caption text-text-muted"><span>Today&apos;s progress</span><span className="tabular-nums">{percent}%</span></div>
        <ProgressBar percent={percent} />
      </div>
    </div>
  );
}

// ── Greeting / progress / streak ─────────────────────────────────────────────
function greetingWord() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}
function Greeting({ name, date, percent, done, total, streak }: { name: string; date: string; percent: number; done: number; total: number; streak: number }) {
  const first = name.split(' ')[0];
  const nice = new Date(`${date}T00:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
  const msg = percent === 100 && total > 0 ? 'Everything done — outstanding.' : percent >= 50 ? 'Great momentum, keep going.' : total > 0 ? "Let's make today count." : 'Plan your day below.';
  return (
    <div className="rounded-sm border border-border bg-card p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-h1">{greetingWord()}, {first}</h1>
          <p className="text-body-sm text-text-secondary">{nice} · {msg}</p>
        </div>
        {streak > 0 && (
          <Badge tone="warning" className="h-7 gap-1 px-2.5 text-body-sm"><Flame className="h-4 w-4" /> {streak}-day streak</Badge>
        )}
      </div>
      <div className="mt-4">
        <div className="mb-1 flex justify-between text-caption text-text-muted">
          <span>Today&apos;s progress</span>
          <span className="tabular-nums">{done}/{total} done · {percent}%</span>
        </div>
        <ProgressBar percent={percent} />
      </div>
    </div>
  );
}
function ProgressBar({ percent }: { percent: number }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-sm bg-surface-2">
      <div className="h-full rounded-sm bg-accent transition-[width] duration-slow" style={{ width: `${percent}%` }} />
    </div>
  );
}

// ── Smart insights ───────────────────────────────────────────────────────────
function SmartInsights({ insights, carriedCount }: { insights: WorkspaceData['insights']; carriedCount: number }) {
  const chips: { icon: typeof Circle; text: string; tone: 'danger' | 'warning' | 'info' | 'neutral' }[] = [];
  if (insights.overdue > 0) chips.push({ icon: AlertTriangle, text: `${insights.overdue} task${insights.overdue > 1 ? 's' : ''} overdue`, tone: 'danger' });
  if (carriedCount > 0) chips.push({ icon: CornerUpRight, text: `${carriedCount} carried over`, tone: 'warning' });
  if (insights.nextMeeting) chips.push({ icon: Clock, text: `${insights.nextMeeting.title} at ${new Date(insights.nextMeeting.at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`, tone: 'info' });
  if (insights.followupsToday > 0) chips.push({ icon: Sparkles, text: `${insights.followupsToday} follow-up${insights.followupsToday > 1 ? 's' : ''} today`, tone: 'info' });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {chips.map((c, i) => (
        <span key={i} className={`inline-flex items-center gap-1.5 rounded-sm border px-2.5 py-1 text-caption ${
          c.tone === 'danger' ? 'border-danger/40 bg-danger-soft/30 text-danger'
          : c.tone === 'warning' ? 'border-warning/40 bg-warning-soft/30 text-warning'
          : 'border-info/40 bg-info-soft/30 text-info'}`}>
          <c.icon className="h-3.5 w-3.5" /> {c.text}
        </span>
      ))}
    </div>
  );
}

// ── Quick actions ────────────────────────────────────────────────────────────
function QuickActions({ onNewTask, onAddNote }: { onNewTask: () => void; onAddNote: () => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="secondary" size="sm" onClick={onNewTask}><Plus className="h-4 w-4" /> New task</Button>
      <Button variant="secondary" size="sm" onClick={onAddNote}><StickyNote className="h-4 w-4" /> Add note</Button>
      <QuickLink href="/meetings" icon={CalendarPlus} label="Start meeting" />
      <QuickLink href="/tasks" icon={ListChecks} label="My tasks" />
      <QuickLink href="/leads/new" icon={UserPlus} label="Create lead" />
      <QuickLink href="/leads/import" icon={Upload} label="Import leads" />
    </div>
  );
}
function QuickLink({ href, icon: Icon, label }: { href: string; icon: typeof Circle; label: string }) {
  return (
    <Link href={href} className="inline-flex h-7 items-center gap-1.5 rounded-sm border border-border bg-surface-2/60 px-2.5 text-caption text-text-secondary hover:border-border-strong hover:text-text">
      <Icon className="h-3.5 w-3.5" /> {label}
    </Link>
  );
}

// ── Task list ────────────────────────────────────────────────────────────────
function TaskGroup({ tasks, tasksState, setTasks, pending, run, highlight }: {
  tasks: WsTask[]; tasksState: WsTask[]; setTasks: (t: WsTask[]) => void; pending: boolean;
  run: (p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void; highlight?: boolean;
}) {
  const [dragId, setDragId] = useState<string | null>(null);

  const onDrop = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const ids = tasksState.map((t) => t.id);
    const from = ids.indexOf(dragId), to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...tasksState];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    setTasks(reordered);
    run(reorderTasks(reordered.map((t) => t.id)));
    setDragId(null);
  };

  if (!tasks.length && !highlight) return <p className="px-1 py-2 text-caption text-text-muted">No tasks yet — add your first below.</p>;
  return (
    <ul className="space-y-1">
      {tasks.map((t) => (
        <TaskRow key={t.id} task={t} pending={pending} run={run}
          draggable onDragStart={() => setDragId(t.id)} onDragOver={(e) => e.preventDefault()} onDrop={() => onDrop(t.id)} />
      ))}
    </ul>
  );
}

function TaskRow({ task, pending, run, ...drag }: {
  task: WsTask; pending: boolean;
  run: (p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void;
} & React.HTMLAttributes<HTMLLIElement>) {
  const [menu, setMenu] = useState(false);
  const [justDone, setJustDone] = useState(false);
  const StateIcon = STATE_ICONS[task.state] ?? Circle;
  const meta = STATE_META[task.state];
  const completed = task.state === DailyTaskState.COMPLETED;

  const toggle = () => {
    const next = completed ? DailyTaskState.NOT_STARTED : DailyTaskState.COMPLETED;
    if (next === DailyTaskState.COMPLETED) { setJustDone(true); setTimeout(() => setJustDone(false), 500); }
    run(setTaskState(task.id, next), next === DailyTaskState.COMPLETED ? 'Nice — task done' : undefined);
  };

  return (
    <li {...drag} className={`group flex items-center gap-2 rounded-sm border border-transparent px-1.5 py-1.5 hover:border-border hover:bg-surface-2/40 ${justDone ? 'scale-[0.99] bg-success-soft/40' : ''} transition-all`}>
      <GripVertical className="h-4 w-4 shrink-0 cursor-grab text-text-muted opacity-0 group-hover:opacity-100" />
      <button onClick={toggle} disabled={pending} title={meta.label}
        className={`shrink-0 transition-transform active:scale-90 ${completed ? 'text-success' : task.state === 'BLOCKED' ? 'text-danger' : task.state === 'IN_PROGRESS' ? 'text-info' : 'text-text-muted hover:text-text'}`}>
        <StateIcon className="h-5 w-5" />
      </button>
      <div className="min-w-0 flex-1">
        <p className={`truncate text-body-sm ${completed ? 'text-text-muted line-through' : 'text-text'}`}>{task.title}</p>
        <div className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          {task.category && <span>{task.category}</span>}
          {task.dueTime && <span className="inline-flex items-center gap-0.5"><Clock className="h-3 w-3" />{task.dueTime.slice(0, 5)}</span>}
          {task.estimatedMinutes != null && <span>~{fmtEstimate(task.estimatedMinutes)}</span>}
          {task.carriedFromDate && <span className="text-warning">carried</span>}
        </div>
      </div>
      <Badge tone={PRIORITY_META[task.priority]?.tone ?? 'neutral'}>{task.priority}</Badge>
      <div className="relative">
        <button onClick={() => setMenu((m) => !m)} className="rounded-sm px-1 text-text-muted hover:bg-white/[0.06] hover:text-text">⋯</button>
        {menu && (
          <div className="absolute right-0 top-6 z-10 w-44 rounded-sm border border-border bg-card p-1 shadow-e2" onMouseLeave={() => setMenu(false)}>
            {(['NOT_STARTED', 'IN_PROGRESS', 'BLOCKED', 'COMPLETED'] as const).map((s) => (
              <button key={s} onClick={() => { setMenu(false); run(setTaskState(task.id, s)); }}
                className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-caption text-text-secondary hover:bg-surface-2 hover:text-text">
                {STATE_META[s].label}
              </button>
            ))}
            <div className="my-1 h-px bg-border" />
            <button onClick={() => { setMenu(false); run(carryTask(task.id, 'tomorrow'), 'Moved to tomorrow'); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-caption text-text-secondary hover:bg-surface-2 hover:text-text"><CornerUpRight className="h-3.5 w-3.5" /> Carry to tomorrow</button>
            <button onClick={() => { setMenu(false); run(carryTask(task.id, 'next_week'), 'Moved to next week'); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-caption text-text-secondary hover:bg-surface-2 hover:text-text"><ChevronRight className="h-3.5 w-3.5" /> Carry to next week</button>
            <button onClick={() => { setMenu(false); run(deleteTask(task.id)); }} className="flex w-full items-center gap-2 rounded-sm px-2 py-1 text-left text-caption text-danger hover:bg-danger-soft/30"><Trash2 className="h-3.5 w-3.5" /> Delete</button>
          </div>
        )}
      </div>
    </li>
  );
}

function fmtEstimate(min: number) { return min >= 60 ? `${(min / 60).toFixed(min % 60 ? 1 : 0)}h` : `${min}m`; }

function AddTaskInline({ inputRef, pending, onAdd }: { inputRef: React.RefObject<HTMLInputElement>; pending: boolean; onAdd: (i: { title: string; priority: string; category: string | null; dueTime: string | null; estimatedMinutes: number | null }) => void }) {
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState('P2');
  const [category, setCategory] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [estimate, setEstimate] = useState('');
  const [expanded, setExpanded] = useState(false);

  const submit = () => {
    if (!title.trim()) return;
    onAdd({ title, priority, category: category || null, dueTime: dueTime || null, estimatedMinutes: estimate ? Number(estimate) : null });
    setTitle(''); setCategory(''); setDueTime(''); setEstimate(''); setExpanded(false);
  };

  return (
    <div className="rounded-sm border border-dashed border-border-strong p-2">
      <div className="flex items-center gap-2">
        <Plus className="h-4 w-4 shrink-0 text-text-muted" />
        <Input ref={inputRef} value={title} onChange={(e) => setTitle(e.target.value)} onFocus={() => setExpanded(true)}
          onKeyDown={(e) => { if (e.key === 'Enter') submit(); }} placeholder="Add a task and press Enter…" className="h-8 flex-1 border-0 bg-transparent px-0 focus:ring-0" />
        <Button size="sm" onClick={submit} disabled={pending || !title.trim()}>Add</Button>
      </div>
      {expanded && (
        <div className="mt-2 flex flex-wrap gap-2 pl-6">
          <Select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-8 w-24 text-caption">
            {PRIORITY_ORDER.map((p) => <option key={p} value={p}>{p}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value)} className="h-8 w-32 text-caption">
            <option value="">Category…</option>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Input type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} className="h-8 w-28 text-caption" title="Due time" />
          <Input type="number" min={0} step={15} value={estimate} onChange={(e) => setEstimate(e.target.value)} placeholder="Est. min" className="h-8 w-24 text-caption" title="Estimated minutes" />
        </div>
      )}
    </div>
  );
}

function AutoItems({ items, pending, run }: { items: AutoItem[]; pending: boolean; run: (p: Promise<{ ok: boolean; error?: string }>, okMsg?: string) => void }) {
  return (
    <div className="rounded-sm border border-border bg-surface-2/40 p-2">
      <p className="mb-1.5 px-1 text-caption font-medium text-text-muted">Due today from across the app — tap + to add to your list</p>
      <ul className="space-y-1">
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-2 px-1 py-1">
            <button title="Add to my to-do list" disabled={pending}
              onClick={() => run(pullAutoItem({ source: it.source, sourceRef: it.id.split(':')[1] ?? '', title: it.title }), 'Added to your list')}
              className="shrink-0 text-accent hover:text-accent-hover"><Plus className="h-4 w-4" /></button>
            <Link href={it.href} className="min-w-0 flex-1 truncate text-body-sm text-text-secondary hover:text-text hover:underline">{it.title}</Link>
            <Badge tone={it.overdue ? 'danger' : 'neutral'}>{it.overdue ? 'overdue' : it.sublabel}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Focus / priorities / blockers / notes ────────────────────────────────────
function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 className="text-overline uppercase text-text-muted">{children}</h3>;
}

function FocusCard({ focus, pending, onSave }: { focus: string; pending: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(focus);
  useEffect(() => setV(focus), [focus]);
  return (
    <Card><CardContent className="space-y-2">
      <SectionTitle>Today&apos;s focus</SectionTitle>
      <p className="text-caption text-text-muted">Your one main objective for the day.</p>
      <Input value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== focus && onSave(v)}
        onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
        placeholder="e.g. Complete outbound outreach" disabled={pending} />
    </CardContent></Card>
  );
}

function PrioritiesCard({ priorities, pending, onSave }: { priorities: string[]; pending: boolean; onSave: (v: string[]) => void }) {
  const [vals, setVals] = useState<string[]>(() => [0, 1, 2].map((i) => priorities[i] ?? ''));
  useEffect(() => setVals([0, 1, 2].map((i) => priorities[i] ?? '')), [priorities]);
  const commit = (next: string[]) => { setVals(next); };
  const save = () => onSave(vals.filter((x) => x.trim()).slice(0, MAX_PRIORITIES));
  return (
    <Card><CardContent className="space-y-2">
      <SectionTitle>Top 3 priorities</SectionTitle>
      {vals.map((val, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent-soft text-caption font-medium text-accent">{i + 1}</span>
          <Input value={val} onChange={(e) => commit(vals.map((x, j) => (j === i ? e.target.value : x)))}
            onBlur={save} onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
            placeholder={`Priority ${i + 1}`} disabled={pending} className="h-8" />
        </div>
      ))}
    </CardContent></Card>
  );
}

function BlockersCard({ blockers, pending, onSave }: { blockers: string; pending: boolean; onSave: (v: string) => void }) {
  const [v, setV] = useState(blockers);
  useEffect(() => setV(blockers), [blockers]);
  return (
    <Card><CardContent className="space-y-2">
      <SectionTitle>Blockers</SectionTitle>
      <p className="text-caption text-text-muted">Anything in your way? (e.g. waiting for founder reply)</p>
      <Textarea value={v} onChange={(e) => setV(e.target.value)} onBlur={() => v !== blockers && onSave(v)}
        placeholder="Leave blank if none" disabled={pending} className="min-h-[72px]" />
    </CardContent></Card>
  );
}

function ProgressNotesCard({ notes, noteRef, pending, onAdd }: { notes: WorkspaceData['notes']; noteRef: React.RefObject<HTMLTextAreaElement>; pending: boolean; onAdd: (v: string) => void }) {
  const [v, setV] = useState('');
  const submit = () => { if (!v.trim()) return; onAdd(v); setV(''); };
  return (
    <Card><CardContent className="space-y-2">
      <SectionTitle>Progress notes</SectionTitle>
      <div className="flex gap-2">
        <Textarea ref={noteRef} value={v} onChange={(e) => setV(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(); }}
          placeholder="Where things stand right now… (⌘/Ctrl+Enter)" className="min-h-[56px] flex-1" />
        <Button size="sm" onClick={submit} disabled={pending || !v.trim()}>Log</Button>
      </div>
      <ul className="space-y-1">
        {notes.map((n) => (
          <li key={n.id} className="flex gap-2 text-caption">
            <span className="shrink-0 tabular-nums text-text-muted">{new Date(n.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
            <span className="text-text-secondary">{n.body}</span>
          </li>
        ))}
      </ul>
    </CardContent></Card>
  );
}

// ── Team today ───────────────────────────────────────────────────────────────
function TeamToday({ team }: { team: WorkspaceData['team'] }) {
  const shown = team.filter((t) => t.total > 0 || t.focus);
  if (!shown.length) return null;
  return (
    <Card><CardContent className="space-y-3">
      <SectionTitle>Team today</SectionTitle>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((m) => (
          <div key={m.userId} className="rounded-sm border border-border bg-surface-2/50 p-3">
            <div className="flex items-center justify-between">
              <p className="truncate text-body-sm font-medium text-text">{m.name}</p>
              {m.finished ? <Badge tone="success">Finished</Badge> : <Badge tone="neutral">{m.remaining} left</Badge>}
            </div>
            <p className="mt-0.5 truncate text-caption text-text-muted" title={m.focus ?? ''}>{m.focus || 'No focus set'}</p>
            <div className="mt-2 flex items-center gap-2">
              <ProgressBar percent={m.percent} />
              <span className="shrink-0 text-caption tabular-nums text-text-muted">{m.percent}%</span>
            </div>
          </div>
        ))}
      </div>
    </CardContent></Card>
  );
}

// ── Finish My Day dialog ─────────────────────────────────────────────────────
function FinishDayDialog({ incomplete, summary, onClose, onSubmit }: {
  incomplete: WsTask[];
  summary: { done: number; total: number; meetings: number; targets: number };
  onClose: () => void;
  onSubmit: (input: { wentWell: string; blockers: string; tomorrow: string; carries: { taskId: string; action: CarryAction }[] }) => void;
}) {
  const [wentWell, setWentWell] = useState('');
  const [blockers, setBlockers] = useState('');
  const [tomorrow, setTomorrow] = useState('');
  const [choices, setChoices] = useState<Record<string, CarryAction>>(() => Object.fromEntries(incomplete.map((t) => [t.id, 'tomorrow' as CarryAction])));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4" onClick={onClose}>
      <div className="max-h-[92vh] w-full max-w-lg overflow-auto rounded-sm border border-border bg-card p-5 shadow-e3" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2">
          <Moon className="h-5 w-5 text-accent" />
          <h2 className="text-h3">Finish my day</h2>
        </div>

        <div className="mb-4 grid grid-cols-4 gap-2">
          <MiniStat label="Done" value={summary.done} tone="success" />
          <MiniStat label="Incomplete" value={incomplete.length} tone="warning" />
          <MiniStat label="Meetings" value={summary.meetings} />
          <MiniStat label="Targets" value={summary.targets} tone="success" />
        </div>

        {incomplete.length > 0 && (
          <div className="mb-4">
            <p className="mb-2 text-overline uppercase text-text-muted">Unfinished tasks — what next?</p>
            <ul className="space-y-1.5">
              {incomplete.map((t) => (
                <li key={t.id} className="flex items-center gap-2">
                  <span className="min-w-0 flex-1 truncate text-body-sm text-text-secondary">{t.title}</span>
                  <Select value={choices[t.id]} onChange={(e) => setChoices((c) => ({ ...c, [t.id]: e.target.value as CarryAction }))} className="h-8 w-36 text-caption">
                    <option value="tomorrow">Carry to tomorrow</option>
                    <option value="next_week">Carry to next week</option>
                    <option value="cancel">Mark cancelled</option>
                    <option value="delete">Delete</option>
                  </Select>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="space-y-3">
          <Field label="What went well?"><Textarea value={wentWell} onChange={(e) => setWentWell(e.target.value)} className="min-h-[60px]" placeholder="Wins worth noting…" /></Field>
          <Field label="Any blockers?"><Textarea value={blockers} onChange={(e) => setBlockers(e.target.value)} className="min-h-[60px]" placeholder="What slowed you down?" /></Field>
          <Field label="Notes for tomorrow"><Textarea value={tomorrow} onChange={(e) => setTomorrow(e.target.value)} className="min-h-[60px]" placeholder="Where to pick up…" /></Field>
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Cancel</Button>
          <Button onClick={() => onSubmit({ wentWell, blockers, tomorrow, carries: incomplete.map((t) => ({ taskId: t.id, action: choices[t.id] })) })}>
            Finish day <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-1"><label className="text-caption font-medium text-text-secondary">{label}</label>{children}</div>;
}
function MiniStat({ label, value, tone }: { label: string; value: number; tone?: 'success' | 'warning' }) {
  const color = tone === 'success' ? 'text-success' : tone === 'warning' ? 'text-warning' : 'text-text';
  return (
    <div className="rounded-sm border border-border bg-surface-2/50 px-2 py-1.5 text-center">
      <div className={`text-h3 tabular-nums ${color}`}>{value}</div>
      <div className="text-caption text-text-muted">{label}</div>
    </div>
  );
}
