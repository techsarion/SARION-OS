# Sarion OS — Product Requirements Document (PRD)

> Internal company-wide work management, execution, meeting, employee, project, and accountability platform for **Sarion**.
> Target scale: **10,000+ users**. Enterprise-grade. Not a task tracker — an operational operating system.

---

## 1. Vision

Sarion OS is the single source of truth for how Sarion works. Every task, meeting, project, decision, approval, document, and report lives inside the platform. Leadership sees real-time company execution; employees see exactly what to do next. Nothing operationally significant happens outside the system.

**One-line:** *Run the entire company from one platform.*

## 2. Goals & Success Metrics

| Goal | Metric | Target (12 mo) |
|------|--------|----------------|
| Full adoption | % of work items created in-platform | > 95% |
| Accountability | % tasks with owner+assignee+due date | 100% |
| Meeting discipline | % meetings producing MOM + action items | > 90% |
| Execution visibility | Dashboard freshness | < 5s realtime |
| Scale | Concurrent active users | 3,000+ |
| Reliability | Uptime | 99.9% |
| Performance | p95 API latency | < 300ms |

## 3. Personas

- **Owner / Super Admin** — needs company health at a glance, controls everything.
- **Managing Director** — strategic initiatives, company/department meetings, budget & decision approvals.
- **Department Head** — runs a department, its projects, people, and performance.
- **Team Lead** — assigns and reviews work, balances team workload.
- **Employee** — executes tasks, joins meetings, uploads docs, submits requests.
- **Guest** — read-only stakeholder/auditor.

## 4. Scope (Modules)

1. Identity, RBAC & Org Hierarchy
2. Employee Management (HR-lite)
3. Departments & Teams
4. Task Management (enterprise)
5. Project Management (Kanban / Scrum / Waterfall, 6 views)
6. Meeting Management (MOM, action items → tasks)
7. Approval Workflow Engine
8. Goals & OKRs
9. Performance Management
10. Dashboards (role-based)
11. Communication (messaging, comments, mentions)
12. Document Management (versioned knowledge base)
13. Notifications (in-app/email/WhatsApp/push)
14. Automation Engine
15. Reporting & Exports
16. Sarion AI Assistant
17. Security, Audit & Admin

## 5. Out of Scope (v1)

- Full payroll / tax processing (HR-lite only).
- Public-facing customer portal.
- Native mobile apps (PWA in v1; native in v2).

## 6. Key Product Principles

- **Every task is accountable** — owner, assignee, priority, due date, status, department, project are required.
- **Meetings produce work** — a meeting is not closed until MOM + action items exist; action items convert to tracked tasks.
- **Hierarchy is configurable** — reporting lines are data, not code.
- **Realtime first** — dashboards and boards update live via WebSockets.
- **Audited by default** — every state change writes an immutable activity/audit record.

## 7. High-Level Workflows

- **Onboarding:** employee created → automation generates onboarding tasks + doc acknowledgements + welcome meeting invite.
- **Meeting lifecycle:** create → invite → conduct → MOM → decisions → action items → tasks → progress tracking.
- **Approval:** request → routed through configurable chain → notifications → decision → audit.
- **Overdue task:** SLA breach → notify assignee + manager → escalation after threshold.

## 8. Release Strategy

Phased delivery (see `10-ROADMAP-SPRINTS.md`). MVP = Identity + Org + Tasks + Projects + Dashboards. Meetings, Approvals, Goals, AI follow in later phases.

## 9. Risks

| Risk | Mitigation |
|------|-----------|
| Scope explosion | Strict phase gating; MVP first |
| Adoption resistance | Migrate real workflows, automation, fast UX |
| Scale/perf | Caching, read models, Elasticsearch, queues |
| Notification fatigue | Per-user channel + digest preferences |
