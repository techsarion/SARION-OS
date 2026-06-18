import 'server-only';
// Read layer for the Targets module. RLS lets every team member see all targets
// (small all-admin team). Results cast to explicit shapes (the pinned supabase
// client degrades inferred types to `never`).
import { createClient } from '@/lib/supabase/server';
import type { TargetPeriod as TargetPeriodT, TargetScope as TargetScopeT, TargetStatus as TargetStatusT } from '@/types/enums';

export interface TargetItem {
  id: string;
  title: string;
  description: string | null;
  period: TargetPeriodT;
  scope: TargetScopeT;
  ownerId: string;
  ownerName: string | null;
  status: TargetStatusT;
  progress: number;
  dueDate: string | null;
  createdAt: string;
}

type TargetSelect = {
  id: string; title: string; description: string | null; period: TargetPeriodT; scope: TargetScopeT;
  owner_id: string; status: TargetStatusT; progress: number; due_date: string | null; created_at: string;
};

async function nameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name');
  return new Map(((data ?? []) as { id: string; full_name: string }[]).map((p) => [p.id, p.full_name]));
}

/** Targets for a given period, optionally narrowed by scope (PERSONAL vs TEAM). */
export async function getTargets(period: TargetPeriodT, scope?: TargetScopeT): Promise<TargetItem[]> {
  const supabase = await createClient();
  let q = supabase
    .from('targets')
    .select('id, title, description, period, scope, owner_id, status, progress, due_date, created_at')
    .eq('period', period);
  if (scope) q = q.eq('scope', scope);
  const [{ data }, names] = await Promise.all([q.order('created_at', { ascending: true }), nameMap()]);
  const rows = (data ?? []) as TargetSelect[];
  return rows.map((t) => ({
    id: t.id, title: t.title, description: t.description, period: t.period, scope: t.scope,
    ownerId: t.owner_id, ownerName: names.get(t.owner_id) ?? null,
    status: t.status, progress: t.progress, dueDate: t.due_date, createdAt: t.created_at,
  }));
}

/** All TEAM-scope targets (shared company goals), regardless of period. */
export async function getTeamTargets(): Promise<TargetItem[]> {
  const supabase = await createClient();
  const [{ data }, names] = await Promise.all([
    supabase
      .from('targets')
      .select('id, title, description, period, scope, owner_id, status, progress, due_date, created_at')
      .eq('scope', 'TEAM')
      .order('created_at', { ascending: true }),
    nameMap(),
  ]);
  const rows = (data ?? []) as TargetSelect[];
  return rows.map((t) => ({
    id: t.id, title: t.title, description: t.description, period: t.period, scope: t.scope,
    ownerId: t.owner_id, ownerName: names.get(t.owner_id) ?? null,
    status: t.status, progress: t.progress, dueDate: t.due_date, createdAt: t.created_at,
  }));
}

/** Lightweight counts for the dashboard (this-week / this-month progress). */
export async function getTargetSummary(period: TargetPeriodT): Promise<{ total: number; completed: number; avgProgress: number }> {
  const supabase = await createClient();
  const { data } = await supabase.from('targets').select('status, progress').eq('period', period);
  const rows = (data ?? []) as { status: TargetStatusT; progress: number }[];
  const total = rows.length;
  const completed = rows.filter((r) => r.status === 'COMPLETED').length;
  const avgProgress = total === 0 ? 0 : Math.round(rows.reduce((s, r) => s + r.progress, 0) / total);
  return { total, completed, avgProgress };
}
