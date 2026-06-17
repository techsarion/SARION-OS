// Placeholder until generated: `npm run db:types` (supabase gen types typescript --local).
// Declares the tables the app reads today so the typed client compiles; the generated
// file (same shape) replaces this once a Supabase project is connected.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type RoleEnum = 'SUPER_ADMIN' | 'MANAGING_DIRECTOR' | 'DEPARTMENT_HEAD' | 'TEAM_LEAD' | 'MARKETING_OFFICER' | 'EMPLOYEE' | 'GUEST';

type ProfileRow = {
  id: string;
  employee_code: string;
  full_name: string;
  email: string;
  phone: string | null;
  designation: string | null;
  role: RoleEnum;
  status: 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
  department_id: string | null;
  manager_id: string | null;
  team_id: string | null;
  join_date: string | null;
  avatar_url: string | null;
  skills: string[];
  created_at: string;
  updated_at: string;
};

type EmploymentStatusEnum = 'ACTIVE' | 'ON_LEAVE' | 'RESIGNED' | 'TERMINATED';
type InvitationStatusEnum = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

type DepartmentRow = {
  id: string;
  name: string;
  description: string | null;
  head_id: string | null;
  created_at: string;
  deleted_at: string | null;
};

type TeamRow = {
  id: string;
  name: string;
  description: string | null;
  department_id: string;
  lead_id: string | null;
  created_at: string;
};

type InvitationRow = {
  id: string;
  email: string;
  full_name: string;
  role: RoleEnum;
  department_id: string | null;
  team_id: string | null;
  token: string;
  status: InvitationStatusEnum;
  invited_by: string | null;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
};

type AuditLogRow = {
  id: string;
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  before: Json | null;
  after: Json | null;
  created_at: string;
};

type TaskStatusEnum = 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'COMPLETED';
type PriorityEnum = 'P0' | 'P1' | 'P2' | 'P3';

type TaskRow = {
  id: string;
  title: string;
  description: string | null;
  department_id: string | null;
  project_id: string | null;
  parent_task_id: string | null;
  owner_id: string;
  assignee_id: string | null;
  priority: PriorityEnum;
  status: TaskStatusEnum;
  start_date: string | null;
  due_date: string | null;
  estimated_hours: number | null;
  actual_hours: number | null;
  tags: string[];
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

type TaskCommentRow = {
  id: string;
  task_id: string;
  author_id: string;
  body: string;
  mentions: string[];
  created_at: string;
};

type TaskActivityRow = {
  id: string;
  task_id: string;
  actor_id: string | null;
  verb: string;
  meta: Json | null;
  created_at: string;
};

type TaskAttachmentRow = {
  id: string;
  task_id: string;
  uploader_id: string | null;
  file_name: string;
  file_path: string;
  file_size: number | null;
  content_type: string | null;
  created_at: string;
};

type TaskWatcherRow = { task_id: string; user_id: string; created_at: string };
type TaskDependencyRow = { id: string; task_id: string; depends_on_task_id: string; created_at: string };

export interface Database {
  // Version marker the Supabase typed client (postgrest-js ≥2.10) reads to
  // resolve table/insert types. `supabase gen types` emits this automatically.
  __InternalSupabase: { PostgrestVersion: '12' };
  public: {
    Tables: {
      profiles: { Row: ProfileRow; Insert: Partial<ProfileRow> & { id: string }; Update: Partial<ProfileRow>; Relationships: [] };
      departments: {
        Row: DepartmentRow;
        Insert: { name: string; description?: string | null; head_id?: string | null };
        Update: Partial<DepartmentRow>;
        Relationships: [];
      };
      teams: {
        Row: TeamRow;
        Insert: { name: string; department_id: string; description?: string | null; lead_id?: string | null };
        Update: Partial<TeamRow>;
        Relationships: [];
      };
      invitations: {
        Row: InvitationRow;
        Insert: {
          email: string; full_name: string; role?: RoleEnum; department_id?: string | null;
          team_id?: string | null; token: string; status?: InvitationStatusEnum;
          invited_by?: string | null; expires_at: string;
        };
        Update: Partial<InvitationRow>;
        Relationships: [];
      };
      tasks: {
        Row: TaskRow;
        Insert: {
          title: string; owner_id: string; description?: string | null; department_id?: string | null;
          project_id?: string | null; parent_task_id?: string | null; assignee_id?: string | null;
          priority?: PriorityEnum; status?: TaskStatusEnum; start_date?: string | null; due_date?: string | null;
          estimated_hours?: number | null; actual_hours?: number | null; tags?: string[];
        };
        Update: Partial<TaskRow>;
        Relationships: [];
      };
      task_comments: {
        Row: TaskCommentRow;
        Insert: { task_id: string; author_id: string; body: string; mentions?: string[] };
        Update: Partial<TaskCommentRow>;
        Relationships: [];
      };
      task_activity: {
        Row: TaskActivityRow;
        Insert: { task_id: string; actor_id?: string | null; verb: string; meta?: Json | null };
        Update: Partial<TaskActivityRow>;
        Relationships: [];
      };
      task_attachments: {
        Row: TaskAttachmentRow;
        Insert: { task_id: string; uploader_id?: string | null; file_name: string; file_path: string; file_size?: number | null; content_type?: string | null };
        Update: Partial<TaskAttachmentRow>;
        Relationships: [];
      };
      task_watchers: {
        Row: TaskWatcherRow;
        Insert: { task_id: string; user_id: string };
        Update: Partial<TaskWatcherRow>;
        Relationships: [];
      };
      task_dependencies: {
        Row: TaskDependencyRow;
        Insert: { task_id: string; depends_on_task_id: string };
        Update: Partial<TaskDependencyRow>;
        Relationships: [];
      };
      audit_log: {
        Row: AuditLogRow;
        Insert: { actor_id?: string | null; action: string; resource_type: string; resource_id?: string | null; before?: Json | null; after?: Json | null };
        Update: Partial<AuditLogRow>;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: {
      role: RoleEnum;
      employment_status: EmploymentStatusEnum;
      invitation_status: InvitationStatusEnum;
      task_status: 'DRAFT' | 'ASSIGNED' | 'IN_PROGRESS' | 'REVIEW' | 'APPROVED' | 'COMPLETED';
      priority: 'P0' | 'P1' | 'P2' | 'P3';
    };
  };
}
