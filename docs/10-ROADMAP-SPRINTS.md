# Sarion OS — Development Roadmap, Sprint & Release Plan

2-week sprints. Squads: **Platform** (infra/auth/RBAC), **Work** (tasks/projects), **Collab** (meetings/comms/docs), **Intelligence** (automation/AI/reporting). Definition of Done: tested (unit+e2e), documented, audited, behind feature flag, perf-checked.

## Phase 0 — Foundations (Sprints 1–2)
- Monorepo, Docker, CI/CD, Terraform skeleton, EKS dev cluster.
- Prisma schema + migrations, seed data. Auth (login, MFA, sessions), RBAC guards, audit log.
- App shell (Next.js layout, nav, design system, command palette).
- **Exit:** users can log in, see role-scoped empty shell.

## Phase 1 — Org & Employees (Sprint 3)
- Departments, teams, membership, configurable org hierarchy. Employee profiles + lifecycle. People directory.
- **Exit:** Super Admin can build the whole org.

## Phase 2 — Tasks (Sprints 4–5) ← MVP core
- Full task CRUD, required-field accountability, status flow + transitions, priority, subtasks, checklists, dependencies (DAG), watchers, comments, attachments, activity, templates, bulk assign, recurring. Elasticsearch search.
- **Exit:** all work assignable & accountable.

## Phase 3 — Projects & Dashboards (Sprints 6–7) ← MVP complete
- Projects (Kanban/Scrum/Waterfall), 6 views (List/Kanban/Calendar/Timeline/Gantt/Workload), sprints.
- Role dashboards (Owner/MD/Dept/Employee) with realtime + cached aggregates.
- **Exit → MVP launch to pilot department.**

## Phase 4 — Meetings (Sprints 8–9)
- Meeting lifecycle, participants/attendance, agenda, MOM, decisions, action-items → task conversion, meeting dashboard, recordings.
- **Exit:** meetings produce tracked work.

## Phase 5 — Approvals & Goals (Sprints 10–11)
- Configurable approval workflow engine + requests/steps/escalation. Goals/OKRs cascade, key results, progress/confidence, KPI linkage.

## Phase 6 — Communication, Documents, Notifications (Sprint 12)
- Channels/messaging, mentions. Versioned document KB. Multi-channel notifications (in-app/email/WhatsApp/push) + preferences/digests.

## Phase 7 — Automation & Reporting (Sprints 13–14)
- Automation engine + no-code builder + reference automations. Reporting (daily/weekly/monthly/quarterly) + PDF/Excel/CSV export.

## Phase 8 — AI & Performance (Sprints 15–16)
- Sarion AI assistant (all 8 capabilities), RAG + guardrails. Performance management (employee + department metrics).

## Phase 9 — Hardening & GA (Sprints 17–18)
- Load/perf tuning, security pen-test, DR drill, observability dashboards, accessibility audit, docs/training.
- **Production Release Plan:** staged rollout — pilot dept → 25% → 100%; blue/green deploy; rollback runbook; on-call + SLOs; data migration from legacy tools; user training & change-management.

## Milestones
| Milestone | Sprint | Outcome |
|---|---|---|
| Alpha (internal) | 5 | tasks usable |
| **MVP / Pilot** | 7 | tasks+projects+dashboards |
| Beta | 11 | meetings+approvals+goals |
| Feature complete | 16 | automation+AI+reporting+perf |
| **GA** | 18 | hardened, full rollout |

## Cross-cutting (every sprint)
Security review, audit coverage, test coverage gate (>80% critical paths), performance budget checks, documentation updates.
