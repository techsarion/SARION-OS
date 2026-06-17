# Sarion OS — API Specification

REST (NestJS) under `/api/v1`. JSON. JWT access (15m) + rotating refresh (7d) in httpOnly cookie. WebSocket gateway at `/realtime`. All list endpoints: `?page&pageSize&sort&filter[...]&q=` (q hits Elasticsearch).

Standard envelope:
```json
{ "data": {}, "meta": { "page": 1, "pageSize": 25, "total": 0 }, "error": null }
```
Errors: RFC-7807-style `{ "error": { "code": "FORBIDDEN", "message": "...", "details": [] } }`. Codes: 400 VALIDATION, 401 UNAUTH, 403 FORBIDDEN, 404 NOT_FOUND, 409 CONFLICT, 422 BUSINESS_RULE, 429 RATE_LIMIT.

## Auth
| Method | Path | Notes |
|---|---|---|
| POST | `/auth/login` | email+password → tokens; triggers MFA challenge if enabled |
| POST | `/auth/mfa/verify` | TOTP code |
| POST | `/auth/refresh` | rotate refresh token |
| POST | `/auth/logout` | revoke session |
| GET  | `/auth/me` | current user + effective permissions |

## Users & Org
| Method | Path | Perm |
|---|---|---|
| GET/POST | `/users` | `user:read` / `user:create` |
| GET/PATCH/DELETE | `/users/:id` | scoped |
| PATCH | `/users/:id/status` | lifecycle Active/On-leave/Resigned/Terminated |
| GET/POST | `/departments` | `dept:*` |
| GET/POST | `/departments/:id/teams` | |
| POST | `/teams/:id/members` | |
| GET | `/org/hierarchy` | tree |
| POST | `/permissions/grants` | super admin |

## Tasks
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/tasks` | filter by assignee/project/status/dueDate; `q` search |
| GET/PATCH/DELETE | `/tasks/:id` | |
| POST | `/tasks/:id/transition` | `{ to: "IN_PROGRESS" }` validates flow + approval gate |
| POST | `/tasks/bulk-assign` | `{ taskIds[], assigneeId }` |
| POST | `/tasks/:id/subtasks` · `/checklist` · `/dependencies` · `/watchers` · `/comments` · `/attachments` | |
| GET | `/tasks/:id/activity` | history |
| POST | `/task-templates/:id/instantiate` | |

## Projects
| Method | Path |
|---|---|
| GET/POST `/projects`, GET/PATCH `/projects/:id` |
| GET `/projects/:id/board?view=kanban\|list\|calendar\|timeline\|gantt\|workload` |
| GET/POST `/projects/:id/sprints` |

## Meetings
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/meetings` | |
| POST | `/meetings/:id/invite` | participants |
| POST | `/meetings/:id/conduct` | mark CONDUCTED, attendance |
| POST | `/meetings/:id/minutes` | create/update MOM (`aiGenerated?`) |
| POST | `/meetings/:id/decisions` · `/action-items` | |
| POST | `/meetings/:id/action-items/:aid/convert` | → Task |
| POST | `/meetings/:id/close` | requires MOM (422 otherwise) |
| GET | `/meetings/dashboard` | upcoming/missed/attendance/pending actions |

## Approvals
| Method | Path |
|---|---|
| GET/POST `/approval-workflows` |
| POST `/approval-requests` · GET `/approval-requests?status=` |
| POST `/approval-requests/:id/steps/:sid/decision` `{ decision, comment }` |

## Goals / Performance / Docs / Notifications
| `GET/POST /goals`, `POST /goals/:id/key-results`, `PATCH /goals/:id/progress` |
| `GET /performance/users/:id`, `GET /performance/departments/:id` |
| `GET/POST /documents`, `POST /documents/:id/versions`, `GET /documents/:id/versions` |
| `GET /notifications`, `PATCH /notifications/:id/read`, `PUT /notification-preferences` |

## Automation / Reporting / AI
| `GET/POST /automations`, `PATCH /automations/:id` (enable), `GET /automations/:id/runs` |
| `POST /reports` `{ type: daily\|weekly\|monthly\|quarterly, scope }` → job; `GET /reports/:id/export?format=pdf\|xlsx\|csv` |
| `POST /ai/tasks-from-goal`, `/ai/meeting-summary`, `/ai/mom`, `/ai/project-plan`, `/ai/risk-detect`, `/ai/delay-predict`, `/ai/workload-balance`, `/ai/exec-summary` |

## Realtime (WebSocket)
Rooms: `user:{id}`, `project:{id}`, `meeting:{id}`, `department:{id}`.
Events: `task.updated`, `task.assigned`, `comment.created`, `notification.new`, `meeting.action_item.created`, `board.moved`, `presence.update`.

## Cross-cutting
- **Rate limiting** per user+IP (Redis token bucket). **Idempotency-Key** header on POST mutations. **OpenAPI 3** auto-generated. **Audit**: every mutating call logged with before/after.
