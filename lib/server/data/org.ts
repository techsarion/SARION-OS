import 'server-only';
// Read layer for org structure & people. Server Components/Actions only.
// Every query goes through the cookie-bound client, so Supabase RLS scopes
// results automatically (admins see all; heads see their department, etc.).
//
// NOTE: results are cast to explicit row shapes because this project's pinned
// supabase-js/postgrest-js pair degrades inferred query types to `never` (the
// same reason lib/auth.ts uses `.single<T>()`). The cast types ARE the columns
// each query selects, so they stay honest.
import { createClient } from '@/lib/supabase/server';

export interface PersonLite { id: string; full_name: string }

/** Minimal people list for assignment dropdowns (heads, leads, managers). */
export async function getProfilesLite(): Promise<PersonLite[]> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name').order('full_name');
  return (data ?? []) as PersonLite[];
}

export interface DepartmentSummary {
  id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  headName: string | null;
  memberCount: number;
  teamCount: number;
}

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  departmentName: string | null;
  lead_id: string | null;
  leadName: string | null;
  memberCount: number;
}

export interface EmployeeRow {
  id: string;
  full_name: string;
  email: string;
  employee_code: string;
  phone: string | null;
  designation: string | null;
  role: string;
  status: string;
  department_id: string | null;
  departmentName: string | null;
  team_id: string | null;
  manager_id: string | null;
  managerName: string | null;
  avatar_url: string | null;
  skills: string[];
}

async function profileNameMap(): Promise<Map<string, string>> {
  const supabase = await createClient();
  const { data } = await supabase.from('profiles').select('id, full_name');
  const rows = (data ?? []) as PersonLite[];
  return new Map(rows.map((p) => [p.id, p.full_name]));
}

// ── Departments ──────────────────────────────────────────────────────────────
export async function getDepartments(): Promise<DepartmentSummary[]> {
  const supabase = await createClient();
  const [deptRes, memberRes, teamRes, names] = await Promise.all([
    supabase.from('departments').select('id, name, description, head_id').is('deleted_at', null).order('name'),
    supabase.from('profiles').select('department_id'),
    supabase.from('teams').select('department_id'),
    profileNameMap(),
  ]);
  const depts = (deptRes.data ?? []) as { id: string; name: string; description: string | null; head_id: string | null }[];
  const members = (memberRes.data ?? []) as { department_id: string | null }[];
  const teams = (teamRes.data ?? []) as { department_id: string | null }[];
  const memberCounts = countBy(members.map((m) => m.department_id));
  const teamCounts = countBy(teams.map((t) => t.department_id));
  return depts.map((d) => ({
    ...d,
    headName: d.head_id ? names.get(d.head_id) ?? null : null,
    memberCount: memberCounts.get(d.id) ?? 0,
    teamCount: teamCounts.get(d.id) ?? 0,
  }));
}

export async function getDepartment(id: string): Promise<DepartmentSummary | null> {
  const all = await getDepartments();
  return all.find((d) => d.id === id) ?? null;
}

// ── Teams ─────────────────────────────────────────────────────────────────────
export async function getTeams(): Promise<TeamSummary[]> {
  const supabase = await createClient();
  const [teamRes, deptRes, memberRes, names] = await Promise.all([
    supabase.from('teams').select('id, name, description, department_id, lead_id').order('name'),
    supabase.from('departments').select('id, name'),
    supabase.from('profiles').select('team_id'),
    profileNameMap(),
  ]);
  const teams = (teamRes.data ?? []) as { id: string; name: string; description: string | null; department_id: string; lead_id: string | null }[];
  const depts = (deptRes.data ?? []) as { id: string; name: string }[];
  const members = (memberRes.data ?? []) as { team_id: string | null }[];
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));
  const memberCounts = countBy(members.map((m) => m.team_id));
  return teams.map((t) => ({
    ...t,
    departmentName: deptNames.get(t.department_id) ?? null,
    leadName: t.lead_id ? names.get(t.lead_id) ?? null : null,
    memberCount: memberCounts.get(t.id) ?? 0,
  }));
}

export async function getTeam(id: string): Promise<TeamSummary | null> {
  const all = await getTeams();
  return all.find((t) => t.id === id) ?? null;
}

// ── Employees ──────────────────────────────────────────────────────────────────
type ProfileSelect = {
  id: string; full_name: string; email: string; employee_code: string; phone: string | null;
  designation: string | null; role: string; status: string; department_id: string | null;
  team_id: string | null; manager_id: string | null; avatar_url: string | null; skills: string[];
};

export async function getEmployees(): Promise<EmployeeRow[]> {
  const supabase = await createClient();
  const [profileRes, deptRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, employee_code, phone, designation, role, status, department_id, team_id, manager_id, avatar_url, skills')
      .order('full_name'),
    supabase.from('departments').select('id, name'),
  ]);
  const profiles = (profileRes.data ?? []) as ProfileSelect[];
  const depts = (deptRes.data ?? []) as { id: string; name: string }[];
  const deptNames = new Map(depts.map((d) => [d.id, d.name]));
  const names = new Map(profiles.map((p) => [p.id, p.full_name]));
  return profiles.map((p) => ({
    ...p,
    departmentName: p.department_id ? deptNames.get(p.department_id) ?? null : null,
    managerName: p.manager_id ? names.get(p.manager_id) ?? null : null,
  }));
}

export async function getEmployee(id: string): Promise<EmployeeRow | null> {
  const all = await getEmployees();
  return all.find((e) => e.id === id) ?? null;
}

/** Direct reports of a manager. */
export async function getDirectReports(managerId: string): Promise<EmployeeRow[]> {
  const all = await getEmployees();
  return all.filter((e) => e.manager_id === managerId);
}

export interface HierarchyNode extends EmployeeRow {
  reports: HierarchyNode[];
}

/** Build the org tree from manager_id links (roots = no manager). */
export async function getHierarchy(): Promise<HierarchyNode[]> {
  const all = await getEmployees();
  const byManager = new Map<string | null, EmployeeRow[]>();
  for (const e of all) {
    const key = e.manager_id;
    if (!byManager.has(key)) byManager.set(key, []);
    byManager.get(key)!.push(e);
  }
  const build = (e: EmployeeRow): HierarchyNode => ({
    ...e,
    reports: (byManager.get(e.id) ?? []).map(build),
  });
  const ids = new Set(all.map((e) => e.id));
  return all.filter((e) => !e.manager_id || !ids.has(e.manager_id)).map(build);
}

function countBy(values: (string | null)[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return m;
}
