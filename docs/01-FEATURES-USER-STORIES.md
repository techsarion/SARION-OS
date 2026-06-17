# Sarion OS — Feature List & User Stories

## 1. Complete Feature List (by module)

### Identity & RBAC
- Email/password + MFA (TOTP), SSO-ready (OIDC), session management, IP allowlists.
- 6 roles, scoped permissions, temporary grants, delegation when on leave.

### Org & Employees
- Unlimited departments → teams → members. Configurable reporting hierarchy.
- Employee profiles (code, contact, designation, manager, join date, skills, documents, status lifecycle Active/On-leave/Resigned/Terminated), performance metrics.

### Tasks
- Full field set, status flow Draft→Assigned→In-Progress→Review→Approved→Completed, P0–P3.
- Subtasks, dependencies, checklists, watchers, recurring (RRULE), templates, bulk assignment, attachments, comments, activity history, approval gating.

### Projects
- Kanban / Scrum / Waterfall. Views: List, Kanban, Calendar, Timeline, Gantt, Workload.
- Budget, dates, owner, team, sprints, status.

### Meetings
- Types: Company / Department / Strategic / Team / Emergency.
- Lifecycle Created→Invited→Conducted→Minuted→Closed. MOM, decisions, action items → tasks, attendance, recording link.
- Meeting dashboard: upcoming, missed, attendance, pending action items.

### Approvals
- Configurable multi-step chains per resource type (expense, budget, decision, leave). Notifications, audit, escalation.

### Goals & OKRs
- Company/Dept/Team/Employee goals, key results, progress %, confidence, KPI linkage, cascade.

### Performance
- Employee: completion rate, timeliness, quality, collaboration. Department: goal achievement, budget adherence, productivity.

### Dashboards
- Role-based (Owner / MD / Department / Employee) — see `07-FRONTEND-UX.md`.

### Communication, Documents, Notifications
- Channels, task/project/meeting comments, mentions. Versioned document KB (SOP/policy/manual). Multi-channel notifications with per-user preferences + digests.

### Automation, Reporting, AI, Security
- Trigger→condition→action engine. Daily/weekly/monthly/quarterly reports, PDF/Excel/CSV export. Sarion AI assistant. Audit logs, encryption, backups.

## 2. Representative User Stories (with acceptance criteria)

**US-1 — Assign accountable task.** *As a Team Lead I assign a task so work is owned.*
- AC: cannot save without owner, assignee, priority, due date, status, department/project. On save, assignee notified; activity recorded.

**US-2 — Meeting produces work.** *As a Department Head I conduct a meeting and capture outcomes.*
- AC: meeting cannot move to CLOSED without MOM + ≥0 action items; each action item can convert to a Task (1:1 link); attendees marked.

**US-3 — Approval chain.** *As an Employee I submit an expense for approval.*
- AC: request routes through configured steps; each approver notified in sequence; rejection stops chain; full audit trail.

**US-4 — Overdue escalation.** *As a Manager I'm alerted when my report's task is overdue.*
- AC: at due date breach, assignee + manager notified; after threshold, escalated to dept head.

**US-5 — Owner visibility.** *As the Owner I see company health live.*
- AC: dashboard loads p95 < 1.5s, updates via WebSocket; shows delayed projects, pending approvals, upcoming meetings, dept/employee performance.

**US-6 — Onboarding automation.** *As HR I add an employee and onboarding starts automatically.*
- AC: creating an ACTIVE employee fires automation → onboarding tasks + policy acknowledgements + welcome meeting invite.

**US-7 — AI MOM.** *As an organizer I generate minutes from notes.*
- AC: AI drafts MOM + extracts decisions + suggests action items; human edits/approves before close.

**US-8 — Scoped access.** *As a Team Lead I only see my team's data.*
- AC: queries return only in-scope rows; attempts to access out-of-scope resource return 403 + audit entry.

(Full backlog of ~120 stories maintained in the issue tracker; this is the canonical seed set.)
