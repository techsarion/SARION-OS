import 'server-only';
// Read layer for Daily Check-Ins (morning) and End-of-Day updates. Both live in
// the `check_ins` table, split by `kind`. RLS lets the whole team see everyone's
// (transparency by default for a 3-person team).
import { createClient } from '@/lib/supabase/server';
import type { CheckinKind as CheckinKindT } from '@/types/enums';

export interface CheckIn {
  id: string;
  userId: string;
  userName: string | null;
  kind: CheckinKindT;
  entryDate: string;
  focus: string | null;
  priorities: string | null;
  progress: string | null;
  completed: string | null;
  unfinished: string | null;
  notes: string | null;
  blockers: string | null;
  updatedAt: string;
}

type CheckInSelect = {
  id: string; user_id: string; kind: CheckinKindT; entry_date: string;
  focus: string | null; priorities: string | null; progress: string | null;
  completed: string | null; unfinished: string | null; notes: string | null;
  blockers: string | null; updated_at: string;
};

const todayISO = () => new Date().toISOString().slice(0, 10);

async function nameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name');
  return new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
}

function map(r: CheckInSelect, names: Map<string, string>): CheckIn {
  return {
    id: r.id, userId: r.user_id, userName: names.get(r.user_id) ?? null, kind: r.kind,
    entryDate: r.entry_date, focus: r.focus, priorities: r.priorities, progress: r.progress,
    completed: r.completed, unfinished: r.unfinished, notes: r.notes, blockers: r.blockers,
    updatedAt: r.updated_at,
  };
}

/** The signed-in user's own entry for a given kind on a date (default today). */
export async function getMyCheckIn(userId: string, kind: CheckinKindT, date = todayISO()): Promise<CheckIn | null> {
  const supabase = await createClient();
  const [{ data }, names] = await Promise.all([
    supabase.from('check_ins').select('id, user_id, kind, entry_date, focus, priorities, progress, completed, unfinished, notes, blockers, updated_at')
      .eq('user_id', userId).eq('kind', kind).eq('entry_date', date).maybeSingle<CheckInSelect>(),
    nameMap(),
  ]);
  return data ? map(data, names) : null;
}

/** Everyone's entries for a kind on a date (default today) — the team view. */
export async function getTeamCheckIns(kind: CheckinKindT, date = todayISO()): Promise<CheckIn[]> {
  const supabase = await createClient();
  const [{ data }, names] = await Promise.all([
    supabase.from('check_ins').select('id, user_id, kind, entry_date, focus, priorities, progress, completed, unfinished, notes, blockers, updated_at')
      .eq('kind', kind).eq('entry_date', date).order('updated_at', { ascending: false }),
    nameMap(),
  ]);
  return ((data ?? []) as CheckInSelect[]).map((r) => map(r, names));
}
