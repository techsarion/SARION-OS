# Sarion OS — Complete Implementation Plan

> CTO-level execution plan derived from docs 00–11. Eight phases (0–7), each specified across 12 dimensions, followed by estimates and a full engineering checklist.
>
> **Scope note:** Phase 5 (full HR, Finance, CRM, Customer Success) expands the original PRD (which scoped HR-lite and marked payroll/CRM out-of-v1). It is included as requested but is the single largest cost driver — treat as a post-GA program. Recommend GA at end of Phase 4 + Phase 7-lite, then Phase 5 as v2.

Legend per phase: **FS** folder structure · **DB** tables · **API** · **SVC** backend services · **FE** pages · **CMP** components · **PERM** permissions · **EVT** events · **NOTIF** notifications · **TEST** · **AC** acceptance criteria · **DEPLOY**.

---

# PHASE 0 — Foundation

**Goal:** runnable monorepo, local full-stack, schema, CI — no business features.

**FS**
```
sarion-os/{turbo.json,pnpm-workspace.yaml,.github/workflows,docker/}
apps/{web,api,workers}
packages/{contracts,rbac,config-eslint,config-ts,sdk}
infra/{terraform,helm}
apps/api/{src/{common,config,infra,modules},prisma/{schema.prisma,migrations,seed.ts}}
apps/web/{app,components,features,lib,styles}
```

**DB** — migrations `0001_extensions_enums` … `0017_constraints_indexes` (all tables created; no data yet beyond seed). Seed: Super Admin, default departments, default approval workflows, notification prefs.

**API** — `GET /health`, `GET /ready`, `GET /version` only.

**SVC** — infra clients (PrismaService, RedisService, BullModule, ElasticsearchService, S3Service, WsGateway bootstrap), ConfigService (zod-validated), EventBus + transactional **outbox** + outbox-relay worker, global filters/interceptors (logging, audit shell).

**FE** — App shell: root layout, theme, login route placeholder, command palette skeleton, API SDK wiring.

**CMP** — design-system primitives (Button, Input, Dialog, DataTable, Toast) from ShadCN; AppShell, Sidebar, Topbar.

**PERM** — permission catalog enumerated in `packages/rbac` (strings only, not yet enforced).

**EVT** — `EventBus` interface + envelope; outbox table + relay.

**NOTIF** — none.

**TEST** — infra integration tests via Testcontainers (Postgres/Redis/ES boot), health e2e, config validation unit, CI green.

**AC** — `docker-compose up` runs full stack; `prisma migrate deploy` + seed succeed; web loads shell; CI pipeline (lint+typecheck+test+build) passes; OpenAPI generates SDK.

**DEPLOY** — dev EKS cluster via Terraform skeleton; images to ECR; Helm deploy of web/api/workers; smoke `/health`.

**Sub-deliverables:** Monorepo setup · Next.js setup · NestJS setup · PostgreSQL setup · Prisma setup · Docker setup · Env config (zod) · Shared package architecture (`contracts`,`rbac`,`sdk`) · **Coding standards** (ESLint+Prettier, naming, module template, error model, conventional commits) · **Git workflow** (trunk-based + short-lived feature branches, PR review ≥1, CI gate, squash-merge, semantic-release tags).

---

# PHASE 1 — Identity & Access

**Goal:** secure login + org backbone; gates everything else.

**FS** — `apps/api/src/modules/{identity,org}`; `packages/rbac` (ability factory); `apps/web/app/(auth)`, `app/admin/{users,departments,teams,roles}`, `app/people`.

**DB** — `User, Session, IpAllowlist, PermissionGrant, Delegation, Department, Team, TeamMember`.

**API** — `/auth/{login,mfa/verify,refresh,logout,me}`; `/users` CRUD + `/users/:id/status`; `/departments`, `/departments/:id/teams`, `/teams/:id/members`; `/org/hierarchy`; `/permissions/grants`.

**SVC** — AuthService (Argon2id, JWT RS256, refresh rotation+reuse detection), MfaService (TOTP), SessionService, AbilityFactory + Redis cache, Guards (`JwtAuth`,`Permissions`,`Scope`), UserService, OrgService (hierarchy cycle guard, single-Super-Admin invariant).

**FE** — Login, MFA challenge, forgot/reset; Admin → Users (table+drawer), Departments, Teams, Roles/permissions; People directory + employee profile.

**CMP** — AuthForm, MfaInput, UserTable, UserDrawer, OrgTreeView, RoleMatrixEditor, EmployeeProfileCard, `<Can>`/`usePermission`.

**PERM** — `user:*`, `dept:*`, `team:*`, `permission:grant`, `auth:impersonate` (super admin). Enforcement live (guards + row scoping).

**EVT** — `UserCreated`, `EmployeeJoined`, `UserStatusChanged`, `DepartmentCreated`, `TeamMemberAdded`, `LoginSucceeded/Failed`.

**NOTIF** — welcome email, password reset, suspicious login.

**TEST** — auth unit (token rotation, MFA), authz fuzz (scope leakage), e2e login→scoped access; single-Super-Admin invariant test.

**AC** — user logs in with MFA; refresh rotates & detects reuse; out-of-scope access → 403 + audit; Super Admin builds full org; only one Super Admin possible.

**DEPLOY** — staging deploy; secrets via Secrets Manager; rate-limit + IP allowlist active.

**Sub-deliverables:** Authentication · MFA · Session management · RBAC · User management · Department management · Team management.

---

# PHASE 2 — Core Work Management (MVP)

**Goal:** accountable tasks, projects, dashboards, notifications → pilot launch.

**FS** — `modules/{task,project,notification,search}`; `workers/processors/{notification,indexing,recurring,escalation}`; `app/{tasks,projects}`, dashboard route group.

**DB** — `Task, TaskWatcher, ChecklistItem, TaskDependency, TaskTemplate, Project, Sprint, Attachment, Comment, Activity, Notification, NotificationPreference`.

**API** — `/tasks` CRUD + `/transition` + `/bulk-assign` + `/subtasks|checklist|dependencies|watchers|comments|attachments|activity`; `/task-templates/:id/instantiate`; `/projects` + `/projects/:id/board?view=` + `/sprints`; `/notifications` + `/notification-preferences`; list search via ES.

**SVC** — TaskService (state machine, required-field guard, DAG cycle check, approval gate), ProjectService (6 views, board), NotificationService (channel fan-out: in-app+email), SearchSync (ES indexing), RecurringTaskWorker (RRULE), EscalationWorker (overdue), DashboardService (cached read models).

**FE** — My Tasks / Assigned / All; Task drawer+page; Project list; Project board (Kanban/List/Calendar/Timeline/Gantt/Workload); 4 role dashboards; Notification center.

**CMP** — TaskCard, TaskDrawer, StatusStepper, PriorityBadge, DependencyGraph, ChecklistEditor, WatcherStack, KanbanBoard, GanttChart, CalendarView, WorkloadHeatmap, MetricTile, NotificationCenter, FileDropzone, MentionInput.

**PERM** — `task:{create,read,assign,transition,delete}`, `project:{create,read,assign}`, `notification:read`. Scoped.

**EVT** — `TaskCreated/Assigned/StatusChanged/Overdue/Completed`, `CommentCreated`, `ProjectCreated`, `SprintStarted`.

**NOTIF** — task assigned, due-soon/overdue, mention, status change, added as watcher.

**TEST** — task state-machine unit, DAG cycle, bulk assign; project board integration; ES sync; realtime WS e2e; dashboard cache invalidation; load test boards.

**AC** — task uncreatable without owner/assignee/priority/due/status/dept/project; transitions validated; realtime board moves; dashboards p95<1.5s & live; search returns scoped results. **→ MVP / pilot.**

**DEPLOY** — staging→pilot department; feature-flagged; read replicas + cache aggregates on; Bull Board behind admin.

**Sub-deliverables:** Task service · Project service · Dashboard service · Notification service.

---

# PHASE 3 — Meeting Management

**Goal:** meetings produce tracked work.

**FS** — `modules/meeting`; `app/meetings/{calendar,[id],mom-library,action-items}`.

**DB** — `Meeting, MeetingParticipant, MeetingMinutes, Decision, ActionItem` (+ Attachment).

**API** — `/meetings` CRUD; `/invite`, `/conduct`, `/minutes`, `/decisions`, `/action-items`, `/action-items/:aid/convert`, `/close`, `/meetings/dashboard`.

**SVC** — MeetingService (state machine CREATED→…→CLOSED, close-gate requires MOM), AttendanceService, ActionItemService (1:1 task conversion), MeetingDashboardService (cached), ICS invite generation.

**FE** — Meetings list/calendar; Meeting workspace (agenda builder → live notes → MOM → decisions → action items → attendance → close); MOM library; Action items board; Meeting dashboard.

**CMP** — AgendaBuilder, LiveNotesEditor (collaborative WS), MomViewer, DecisionList, ActionItemRow (Convert-to-task), AttendanceGrid, MeetingDashboardTiles.

**PERM** — `meeting:{create,conduct,minute,close}` (scoped: company→MD, dept→head, team→lead), `meeting:read`.

**EVT** — `MeetingCreated/Invited/Conducted/Minuted/Closed`, `ActionItemCreated`, `DecisionRecorded`.

**NOTIF** — meeting invite (+ICS), reminder, MOM published, action item assigned, missed-meeting.

**TEST** — state-machine + close-gate unit, action-item→task 1:1 integration, attendance, collaborative notes WS, meeting dashboard accuracy.

**AC** — meeting cannot CLOSE without MOM; each action item converts to exactly one linked task; dashboard shows upcoming/missed/attendance/pending actions; AI MOM draft editable before approve.

**DEPLOY** — staging→pilot; recordings to S3 (presigned).

**Sub-deliverables:** Meeting service · Agenda management · MOM generation (manual + AI-draft) · Action item generation · Meeting analytics (dashboard).

---

# PHASE 4 — Organization Operations

**Goal:** approvals, OKRs, SOPs, knowledge base.

**FS** — `modules/{approval,goal,document}`; `app/{approvals,goals,documents}`.

**DB** — `ApprovalWorkflow, ApprovalRequest, ApprovalStep, Goal, KeyResult, Document, DocumentVersion`.

**API** — `/approval-workflows`, `/approval-requests` + `/steps/:sid/decision`; `/goals` + `/key-results` + `/progress`; `/documents` + `/versions`.

**SVC** — ApprovalEngine (configurable multi-step, sequential routing, escalation), GoalService (cascade company→dept→team→employee, KPI linkage, confidence), DocumentService (versioning, checksum, S3 versioning, AV scan hook).

**FE** — Approvals (My requests / Awaiting me) + chain viz; OKR tree + key-result editor; Document KB (browse, version history, upload).

**CMP** — ApprovalChainViz, ApproveRejectBar, OkrTree, ProgressRing, KeyResultEditor, DocBrowser, VersionHistory, DocUploader.

**PERM** — `approval:{create,decide,configure}`, `goal:{create,update}` (scoped by level), `document:{create,read,version}`.

**EVT** — `ApprovalRequested/Decided`, `GoalCreated`, `GoalAtRisk`, `DocumentVersioned`.

**NOTIF** — approval requested (to next approver), approved/rejected, goal at risk, new SOP/policy to acknowledge.

**TEST** — approval routing + escalation + rejection-stops-chain unit/e2e; goal cascade & rollup; document version integrity + AV gate.

**AC** — request routes through configured steps sequentially; rejection halts; full audit; OKRs cascade and roll up progress; documents immutably versioned with checksum.

**DEPLOY** — staging→full org (beta).

**Sub-deliverables:** Approvals · OKRs · SOP management · Knowledge base.

---

# PHASE 5 — Business Modules *(scope expansion / v2 program)*

**Goal:** HR, Finance, CRM, Customer Success as first-class modules. **Largest single cost driver.**

**FS** — `modules/{hr,finance,crm,customer-success}`; `app/{hr,finance,crm,success}`.

**DB (new)** —
- HR: `LeaveRequest, LeaveBalance, Attendance, OnboardingPlan, OffboardingPlan, EmployeeDocument, AppraisalCycle, AppraisalReview, Payslip*` (*payroll calc may integrate external).
- Finance: `Budget, BudgetLine, Expense, ExpenseClaim, Invoice, Vendor, PurchaseOrder, Transaction, CostCenter`.
- CRM: `Account, Contact, Lead, Opportunity, Pipeline, Stage, Activity(CRM), Quote`.
- Customer Success: `Customer, Subscription, HealthScore, Ticket, Renewal, OnboardingJourney, NPSResponse`.

**API** — module-scoped CRUD + workflows: `/hr/leave-requests`, `/hr/appraisals`, `/finance/expenses`, `/finance/budgets`, `/finance/invoices`, `/crm/leads`, `/crm/opportunities`, `/success/customers`, `/success/tickets`, `/success/health`.

**SVC** — LeaveService (balance + approval chain reuse), AppraisalService, BudgetService (links to approvals), ExpenseService, InvoiceService, LeadService, PipelineService (stage automation), HealthScoreService, TicketService, RenewalService.

**FE** — HR portal (leave, attendance, appraisals, onboarding), Finance (budgets, expenses, invoices, vendors), CRM (pipeline board, accounts, leads), Customer Success (health dashboard, tickets, renewals).

**CMP** — LeaveCalendar, AppraisalForm, BudgetTable, ExpenseClaimForm, InvoiceBuilder, PipelineKanban, OpportunityCard, HealthScoreGauge, TicketQueue, RenewalTimeline.

**PERM** — new namespaces `hr:*`, `finance:*`, `crm:*`, `success:*` with role mapping (Finance approvals to Finance dept/MD; HR to HR dept).

**EVT** — `LeaveRequested/Decided`, `ExpenseSubmitted/Approved`, `InvoiceIssued/Paid`, `LeadCreated`, `OpportunityStageChanged`, `TicketOpened/Resolved`, `RenewalDue`, `HealthScoreChanged`.

**NOTIF** — leave decisions, expense approvals, invoice due, lead assigned, ticket SLA, renewal upcoming, health-drop alert.

**TEST** — each module unit+integration; reuse approval engine for leave/expense/budget; CRM pipeline automation; CS SLA timers; finance ledger integrity.

**AC** — leave & expense flow through approval engine + audit; CRM pipeline tracks opportunities with stage automation; CS health/renewals tracked with alerts; finance budgets enforce spend.

**DEPLOY** — phased per sub-module to relevant departments; integrate external systems (payroll/accounting) via adapters where needed.

**Sub-deliverables:** HR · Finance · CRM · Customer Success.

---

# PHASE 6 — Automation Platform

**Goal:** no-code automation across all modules.

**FS** — `modules/automation`; `workers/processors/automation`; `app/admin/automations`.

**DB** — `Automation, AutomationRun` (+ reuse all domain events).

**API** — `/automations` CRUD + `/enable` + `/automations/:id/runs` + `/automations/:id/dry-run`.

**SVC** — TriggerEngine (subscribes to domain events), ConditionEvaluator (JSON boolean expr), ActionExecutor (create_task, notify, send_email/whatsapp, create_meeting, create_approval, escalate, update_field, generate_report, call_ai), AutomationWorker (idempotent, retries, DLQ), Scheduler (cron triggers).

**FE** — Automation list; no-code builder (trigger → condition rows → action steps); run history; dry-run tester.

**CMP** — TriggerPicker, ConditionBuilder, ActionStepEditor, RuleCanvas, RunHistoryTable, DryRunPanel, JsonAdvancedMode.

**PERM** — `automation:{create,update,enable,run}` (super admin + scoped dept heads).

**EVT** — consumes all; emits `AutomationExecuted`, `AutomationFailed`.

**NOTIF** — automation failure alert to owner; (automations themselves trigger notifications).

**TEST** — trigger matching, condition eval, each action type, idempotency, DLQ, dry-run correctness, reference automations (onboarding, overdue escalation, meeting follow-ups).

**AC** — rules fire on events, conditions filter correctly, actions execute idempotently, failures retried+DLQ, dry-run before enable, no-code builder produces working rule.

**DEPLOY** — staging→prod; automation workers autoscaled by queue depth.

**Sub-deliverables:** Workflow engine · Trigger engine · Queue processing · Rule builder.

---

# PHASE 7 — AI Platform

**Goal:** Sarion AI assistant + intelligence features.

**FS** — `modules/ai`; `workers/processors/ai`; `app/(ai-drawer)`, `app/admin/ai`, executive dashboard.

**DB** — stateless (logs `AiRequest` optional); reads scoped data via ES/Postgres (RAG).

**API** — `/ai/{tasks-from-goal,meeting-summary,mom,project-plan,risk-detect,delay-predict,workload-balance,exec-summary}`.

**SVC** — AiOrchestrator (RAG over scoped ES/Postgres + tool-calling read APIs), GuardrailService (scope-only context, PII redaction, output schema validation, rate/cost limits), AiWorker (async, streamed via WS), PredictiveService (velocity/overdue/dependency feature computation feeding LLM).

**FE** — AI drawer (✦, context-aware); AI MOM in meeting; AI task-from-goal in goals; Executive AI dashboard (auto exec summary, risks, delay predictions, workload suggestions).

**CMP** — AIAssistantDrawer, AiStreamMessage, RiskList, DelayForecastChart, WorkloadSuggestionPanel, ExecSummaryCard.

**PERM** — `ai:use` (all), `ai:exec` (owner/MD for exec summaries), scope-bound context.

**EVT** — `AiJobCompleted`; consumes `MeetingClosed` (auto MOM), `GoalCreated`.

**NOTIF** — AI insight ready, risk detected, delay predicted.

**TEST** — RAG scope-leak tests (must never return out-of-scope data), output schema validation, guardrail/PII redaction, prediction sanity, streaming e2e, cost-limit enforcement.

**AC** — AI outputs are drafts requiring human approval for writes; context strictly scope-filtered; MOM/tasks/plans generated and editable; risks/delays surfaced with drivers; exec summary owner-ready; costs bounded.

**DEPLOY** — staging→prod; model routing (`claude-opus-4-8` planning, `claude-haiku-4-5` extraction); ai-jobs queue rate-limited. **→ GA (with Phases 0–4,6,7).**

**Sub-deliverables:** AI Assistant · AI Meeting Assistant · AI Task Generator · AI Risk Detection · Executive AI Dashboard.

---

# Estimates

Story points use a Fibonacci scale; velocity assumed **~40 SP / sprint / squad** of 5 engineers; **2-week sprints**. Squads run in parallel where dependencies allow (Platform → then Work/Collab/Intelligence concurrently).

| Phase | Story Points | Sprints (serialized) | Notes |
|---|---:|---:|---|
| 0 Foundation | 55 | 2 | blocking; one squad |
| 1 Identity & Access | 80 | 2 | blocking |
| 2 Core Work (MVP) | 130 | 3–4 | two squads parallel |
| 3 Meetings | 75 | 2 | |
| 4 Org Operations | 90 | 2–3 | |
| 5 Business Modules | 260 | 6–8 | scope expansion; can split squads per sub-module |
| 6 Automation | 70 | 2 | |
| 7 AI Platform | 95 | 2–3 | |
| Hardening/Sec/Perf/IaC (cross-cutting) | 80 | 2 | overlaps |
| **Total** | **~935 SP** | **~18 sprints** (with parallelism) / ~23–25 serialized | |

**Team size (steady state):**
- 1 Eng Manager / Tech Lead, 1 Architect (you, CTO oversight)
- 8–10 engineers across 4 squads (Platform, Work, Collab, Intelligence) — 2–3 each
- 2 Frontend specialists, 1 UX designer
- 1 DevOps/SRE, 1 QA automation, 1 Security (part-time/shared)
- 1 Product Manager
- **≈ 14–16 people** at peak (Phase 5 may add a dedicated business-modules squad of 3–4).

**Timeline:** ~**9 months to GA** (Phases 0–4, 6, 7 with parallelism), **+3–4 months** for Phase 5 business modules → **~12–13 months** full program.

**Cost estimate (rough, fully-loaded, illustrative — adjust to your region/rates):**
- Engineering: 15 people × ~12 months. At a blended ~$8k–$12k/person/month → **~$1.4M–$2.2M** for full program; MVP (Phases 0–2, ~4 months, ~8 people) ≈ **$300k–$450k**.
- Infra (AWS dev+staging+prod, EKS/RDS/Redis/OpenSearch/S3): **~$6k–$15k/month** scaling with load.
- AI (LLM usage at 10k users): **~$3k–$10k/month** depending on adoption of AI features.
- Tooling/licenses (CI, monitoring, security scanners): **~$1k–$3k/month**.
- **Contingency:** +15–20%.

> These are planning-grade ranges, not a quote — finalize against actual rates and AWS pricing for your region.

---

# Engineering Execution Checklist

## Phase 0 — Foundation
- [ ] pnpm workspaces + Turborepo configured
- [ ] `packages/{contracts,rbac,sdk,config-eslint,config-ts}` scaffolded
- [ ] Next.js app shell (layout, theme, command palette, login placeholder)
- [ ] NestJS app (main, app.module, common, config, infra)
- [ ] PostgreSQL + PgBouncer local; RDS dev provisioned
- [ ] Prisma schema + migrations 0001–0017 + seed
- [ ] Docker images (web/api/workers) + docker-compose full stack
- [ ] Env config zod-validated; Secrets Manager wired
- [ ] EventBus + transactional outbox + outbox-relay worker
- [ ] Audit interceptor shell + Audit module subscribing to events
- [ ] Coding standards doc (ESLint/Prettier, module template, error model)
- [ ] Git workflow (trunk-based, PR gate, conventional commits, semantic-release)
- [ ] CI pipeline green (lint+typecheck+test+build+OpenAPI diff+boundary check)
- [ ] Health/ready/version endpoints; Helm deploy to dev; smoke pass

## Phase 1 — Identity & Access
- [ ] Auth: login (Argon2id), JWT RS256, refresh rotation + reuse detection
- [ ] MFA (TOTP) enrollment + verify
- [ ] Session management + revocation + device list
- [ ] IP allowlist + rate limiting
- [ ] RBAC: permission catalog + ability factory + Redis cache
- [ ] Guards: JwtAuth + Permissions + Scope; repository row-scoping
- [ ] Single-Super-Admin invariant (DB + service)
- [ ] User management CRUD + status lifecycle
- [ ] Department management + hierarchy (cycle guard)
- [ ] Team management + membership
- [ ] People directory + employee profiles
- [ ] Events: UserCreated/EmployeeJoined/StatusChanged/Login*
- [ ] Notifications: welcome/reset/suspicious-login
- [ ] Tests: auth unit, authz fuzz, scope-leak, e2e; AC met
- [ ] Staging deploy

## Phase 2 — Core Work Management (MVP)
- [ ] Task CRUD + required-field accountability guard
- [ ] Task state machine + transition validation + approval gate
- [ ] Subtasks, dependencies (DAG cycle check), checklist, watchers
- [ ] Comments + @mentions, attachments (presigned S3), activity timeline
- [ ] Task templates + bulk assign + recurring (RRULE worker)
- [ ] Project CRUD + sprints
- [ ] Project board: List/Kanban/Calendar/Timeline/Gantt/Workload
- [ ] Realtime board via WS rooms
- [ ] Elasticsearch indexing + scoped search
- [ ] Notification service (in-app + email) + preferences
- [ ] Escalation worker (overdue)
- [ ] Dashboards: Owner/MD/Dept/Employee (cached read models, realtime)
- [ ] Tests: state machine, DAG, board integration, WS e2e, load
- [ ] AC met → **MVP / pilot deploy** (feature-flagged, read replicas, cache)

## Phase 3 — Meeting Management
- [ ] Meeting CRUD + state machine + close-gate (requires MOM)
- [ ] Invitations + ICS + attendance
- [ ] Agenda builder + collaborative live notes (WS)
- [ ] MOM (manual + AI draft) + decisions
- [ ] Action items + 1:1 task conversion
- [ ] Meeting dashboard (upcoming/missed/attendance/pending actions)
- [ ] Recordings to S3
- [ ] Events + notifications (invite/reminder/MOM/action-item/missed)
- [ ] Tests + AC met; staging→pilot

## Phase 4 — Organization Operations
- [ ] Approval workflow engine (configurable, sequential, escalation)
- [ ] Approval requests + steps + decisions + audit
- [ ] OKRs: company/dept/team/employee cascade + key results + confidence + KPI
- [ ] Document KB: versioning + checksum + S3 versioning + AV scan
- [ ] SOP/policy acknowledgement flow
- [ ] Events + notifications (approval/goal-at-risk/new-SOP)
- [ ] Tests + AC met; beta to full org

## Phase 5 — Business Modules (v2)
- [ ] HR: leave, attendance, onboarding/offboarding, appraisals, docs
- [ ] Finance: budgets, expenses, invoices, vendors, POs, cost centers
- [ ] CRM: accounts, contacts, leads, opportunities, pipeline automation, quotes
- [ ] Customer Success: customers, subscriptions, health score, tickets, renewals, NPS
- [ ] Reuse approval engine for leave/expense/budget
- [ ] External integrations (payroll/accounting) via adapters
- [ ] Per-module permissions, events, notifications
- [ ] Tests + AC met; phased rollout per department

## Phase 6 — Automation Platform
- [ ] Trigger engine (domain-event subscription)
- [ ] Condition evaluator (JSON boolean)
- [ ] Action executor (all action types) + idempotency + DLQ
- [ ] Cron scheduler triggers
- [ ] No-code rule builder + JSON advanced mode + dry-run
- [ ] Reference automations (onboarding, overdue, meeting follow-ups)
- [ ] Run history + failure alerts
- [ ] Tests + AC met; autoscaled workers

## Phase 7 — AI Platform
- [ ] AI orchestrator + RAG over scoped data + tool-calling
- [ ] Guardrails (scope-only, PII redaction, schema validation, cost/rate limits)
- [ ] AI worker (async, WS streaming) + model routing
- [ ] AI Assistant drawer (context-aware)
- [ ] AI Meeting Assistant (MOM/summary)
- [ ] AI Task Generator (tasks-from-goal, project plan)
- [ ] AI Risk Detection + Delay Prediction + Workload Balancing
- [ ] Executive AI Dashboard
- [ ] Tests: scope-leak, guardrails, predictions, streaming; AC met → **GA**

## Cross-cutting (every phase / pre-GA)
- [ ] Security: pen-test, SAST/DAST gates, field-level encryption, audit hash-chaining
- [ ] Performance: k6 to 3k concurrent, p95 budgets, partitioning live
- [ ] Observability: Prometheus/Grafana/Loki/OTel, Bull Board, alerting + SLOs
- [ ] Accessibility AA pass
- [ ] IaC complete: Terraform envs + Helm + External Secrets + (ArgoCD)
- [ ] CI/CD release pipeline + blue/green + rollback runbook
- [ ] DR: Multi-AZ + cross-region replica + PITR + restore drill
- [ ] Production rollout: pilot → 25% → 100%, data migration, training, on-call live
