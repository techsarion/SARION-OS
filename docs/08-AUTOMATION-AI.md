# Sarion OS — Automation & AI Modules

## 1. Automation Engine

**Model:** `Trigger → Condition (optional) → Actions[]`, evaluated on domain events. Stored in `Automation`; each execution logged in `AutomationRun`. Runs async via BullMQ; idempotent; retried with backoff; failures dead-lettered.

### Triggers
`EMPLOYEE_JOINED`, `EMPLOYEE_STATUS_CHANGED`, `PROJECT_CREATED`, `TASK_CREATED`, `TASK_OVERDUE`, `TASK_STATUS_CHANGED`, `MEETING_COMPLETED`, `APPROVAL_DECIDED`, `GOAL_AT_RISK`, `SCHEDULE` (cron).

### Conditions (JSON)
Boolean expressions over event payload + entity fields, e.g. `{ "department": "Sales", "priority": "P0" }`.

### Actions (ordered, JSON)
`create_task`, `create_tasks_from_template`, `assign`, `notify`, `send_email`, `send_whatsapp`, `create_meeting`, `create_approval_request`, `add_watcher`, `update_field`, `escalate`, `generate_report`, `call_ai`.

### Reference automations
| Trigger | Condition | Actions |
|---|---|---|
| EMPLOYEE_JOINED | status=ACTIVE | create onboarding task template + policy acknowledgements + welcome meeting invite |
| PROJECT_CREATED | — | instantiate project template (phases, default tasks, kickoff meeting) |
| MEETING_COMPLETED | — | AI generate MOM → create action-item tasks → notify assignees |
| TASK_OVERDUE | — | notify assignee + manager; escalate to dept head after 48h |
| GOAL_AT_RISK | confidence<0.4 | notify owner; create review meeting |
| APPROVAL_DECIDED | status=APPROVED, type=expense | notify finance; update budget ledger |

**Builder UX:** no-code rule builder (trigger picker → condition rows → action steps), plus JSON advanced mode. Test/dry-run against a sample event before enabling.

## 2. Sarion AI Assistant

LLM service (Claude) behind `/ai/*`. Context-aware (current screen, scoped data). All AI output is **draft → human approves** for anything that writes (MOM, tasks, plans).

| Capability | Endpoint | Input → Output |
|---|---|---|
| Tasks from goal | `/ai/tasks-from-goal` | goal + dept → proposed task list (title, owner suggestion, est. hours, deps) |
| Meeting summary | `/ai/meeting-summary` | notes/transcript → concise summary |
| MOM | `/ai/mom` | agenda + notes → structured minutes + decisions + action items |
| Project plan | `/ai/project-plan` | brief → phases, milestones, task breakdown, timeline |
| Risk detection | `/ai/risk-detect` | project state → ranked risks + mitigations |
| Delay prediction | `/ai/delay-predict` | task/project velocity + deps → likelihood + drivers |
| Workload balancing | `/ai/workload-balance` | team capacity + assignments → rebalance suggestions |
| Executive summary | `/ai/exec-summary` | company metrics → owner-ready narrative |

**Architecture:** retrieval over scoped entities (RAG from Postgres/Elasticsearch) + tool-calling (the AI may call read APIs). Guardrails: permission-scoped context only, PII redaction in logs, output validation against schemas, cost/rate limits per user. Model: `claude-opus-4-8` for complex planning/summaries; `claude-haiku-4-5` for cheap classification/extraction. Async via queue; results streamed to the AI drawer over WebSocket.

**Predictive features** (delay/risk) blend LLM reasoning with computed signals (velocity, overdue ratio, dependency depth, historical completion) — features precomputed by workers, fed as structured context.
