# Sarion OS — Technical Design Specification (TDS)

> The engineering blueprint a senior team follows to build Sarion OS. No example code — structures, contracts, and sequence only. Pairs with docs 00–10.

---

## 1. Monorepo Folder Structure (Next.js + NestJS)

Tooling: **pnpm workspaces + Turborepo**. Single repo, typed contracts shared across web/api.

```
sarion-os/
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
├─ .github/workflows/            # CI/CD pipelines
├─ docker/                       # Dockerfiles, compose for local stack
├─ infra/                        # Terraform + Helm (IaC)
│  ├─ terraform/{modules,envs/{dev,staging,prod}}
│  └─ helm/sarion/{templates,values-*.yaml}
│
├─ apps/
│  ├─ web/                       # Next.js 15 (App Router)
│  │  ├─ app/                    # routes (route groups by domain)
│  │  │  ├─ (auth)/  (dashboard)/  tasks/  projects/  meetings/
│  │  │  ├─ goals/  approvals/  people/  documents/  reports/  admin/
│  │  ├─ components/             # ShadCN-based UI + domain components
│  │  ├─ features/               # feature modules (hooks, queries, stores)
│  │  ├─ lib/                    # api client, ws client, auth, permissions
│  │  └─ styles/
│  │
│  ├─ api/                       # NestJS modular monolith
│  │  ├─ src/
│  │  │  ├─ main.ts  app.module.ts
│  │  │  ├─ common/              # guards, interceptors, filters, decorators, pipes
│  │  │  ├─ config/              # env schema + config module
│  │  │  ├─ infra/               # prisma, redis, bullmq, elasticsearch, s3, ws clients
│  │  │  └─ modules/             # bounded contexts (see §4)
│  │  │     ├─ identity/  org/  task/  project/  meeting/  approval/
│  │  │     ├─ goal/  performance/  document/  notification/
│  │  │     ├─ automation/  reporting/  ai/  audit/  search/
│  │  └─ prisma/{schema.prisma,migrations/,seed.ts}
│  │
│  └─ workers/                   # BullMQ processors (own process/deployment)
│     └─ src/processors/{notification,report,automation,ai,recurring,indexing,escalation}
│
└─ packages/
   ├─ contracts/                 # shared TS types, zod schemas, OpenAPI types, event types
   ├─ rbac/                      # permission catalog + ability factory (shared web/api)
   ├─ ui/                        # design system primitives (optional split from web)
   ├─ config-eslint/  config-ts/ # shared tooling configs
   └─ sdk/                       # generated API client (from OpenAPI) consumed by web
```

Each NestJS module folder is uniform: `*.module.ts`, `*.controller.ts`, `*.service.ts`, `dto/`, `entities/` (Prisma-mapped), `events/`, `listeners/`, `repository.ts`, `*.spec.ts`.

---

## 2. Database Migration Order

Migrations must respect FK dependency order. Sequence (one Prisma migration per logical group, named by ordinal):

1. **`0001_extensions_enums`** — pgcrypto/citext; all enums.
2. **`0002_identity`** — `User` (self-FK manager added later), `Session`, `IpAllowlist`.
3. **`0003_org`** — `Department`, `Team`, `TeamMember`; then ALTER `User.departmentId`, `User.managerId` FKs.
4. **`0004_rbac`** — `PermissionGrant`, `Delegation`.
5. **`0005_project`** — `Project`, `Sprint`.
6. **`0006_task`** — `Task`, `TaskWatcher`, `ChecklistItem`, `TaskDependency`, `TaskTemplate`.
7. **`0007_meeting`** — `Meeting`, `MeetingParticipant`, `MeetingMinutes`, `Decision`, `ActionItem`.
8. **`0008_approval`** — `ApprovalWorkflow`, `ApprovalRequest`, `ApprovalStep`.
9. **`0009_goal`** — `Goal`, `KeyResult`.
10. **`0010_performance`** — `PerformanceMetric`.
11. **`0011_document`** — `Document`, `DocumentVersion`.
12. **`0012_shared`** — `Attachment`, `Comment`, `Activity` (FKs to task/meeting now exist).
13. **`0013_communication`** — `Channel`, `Message`.
14. **`0014_notification`** — `Notification`, `NotificationPreference`.
15. **`0015_automation`** — `Automation`, `AutomationRun`.
16. **`0016_audit`** — `AuditLog`.
17. **`0017_constraints_indexes`** — unique partial index (single Super Admin), composite indexes, partitioning setup for `AuditLog`/`Activity`/`Notification` (declarative monthly partitions), GIN indexes for `tags[]`/`skills[]`.

Seed runs after 0017: Super Admin, default departments, default approval workflows, notification preferences, sample automations.

Rule: **never edit a shipped migration**; forward-only. Destructive changes use expand→migrate→contract.

---

## 3. Prisma Migration Files (structure & policy)

- Authoring: edit `schema.prisma` → `prisma migrate dev --name <ordinal_group>` in dev → review generated SQL → commit both `migration.sql` and updated `schema.prisma`.
- Deploy: `prisma migrate deploy` in CI (idempotent, applies pending only).
- Each migration folder: `migrations/<timestamp>_<name>/migration.sql` + `migration_lock.toml`.
- Conventions baked in: `@map`/`@@map` snake_case, `cuid()` ids, `created_at/updated_at`, soft-delete `deleted_at`, partial indexes for soft-delete filtering.
- Zero-downtime: additive first (nullable columns / new tables), backfill via worker job, then enforce NOT NULL/constraints in a later migration. Index creation uses `CREATE INDEX CONCURRENTLY` (run outside transaction via `--create-only` + manual edit).
- Partitioning: `AuditLog`, `Activity`, `Notification`, `Message` declared as partitioned parents; a scheduled job pre-creates next-month partitions.

---

## 4. Domain-Driven Design Boundaries

Bounded contexts (each = one NestJS module, owns its tables, no cross-module table access — only via service interface or domain event):

| Context | Aggregate roots | Owns | Publishes |
|---|---|---|---|
| **Identity** | User, Session | auth, RBAC grants | `UserCreated`, `UserStatusChanged`, `EmployeeJoined` |
| **Org** | Department, Team | hierarchy, membership | `DepartmentCreated`, `TeamMemberAdded` |
| **Task** | Task | tasks, subtasks, deps, checklist | `TaskCreated/Assigned/StatusChanged/Overdue/Completed` |
| **Project** | Project, Sprint | projects, board views | `ProjectCreated`, `SprintStarted` |
| **Meeting** | Meeting | MOM, decisions, action items | `MeetingCreated/Conducted/Closed`, `ActionItemCreated` |
| **Approval** | ApprovalRequest | workflow engine | `ApprovalRequested/Decided` |
| **Goal** | Goal | OKRs, key results | `GoalCreated`, `GoalAtRisk` |
| **Performance** | PerformanceMetric | metric computation | `MetricsComputed` |
| **Document** | Document | versioned KB | `DocumentVersioned` |
| **Notification** | Notification | fan-out + prefs | — (consumer) |
| **Automation** | Automation | rule engine | `AutomationExecuted` |
| **Reporting** | Report | report generation | — (consumer) |
| **AI** | — (stateless) | LLM orchestration | — |
| **Audit** | AuditLog | append-only log | — (consumer) |
| **Search** | — | ES index sync | — (consumer) |

Rules: **shared kernel** = `packages/contracts` (types, event shapes) + `packages/rbac`. Cross-context reads go through published interfaces; writes never reach another context's repository. Anti-corruption at module boundaries via DTO mapping. Consistency within an aggregate is transactional; across aggregates is eventual (events).

---

## 5. Module Dependency Graph

```
                       common / config / infra (foundation — used by all)
                                    │
            ┌────────────┬──────────┼───────────┬─────────────┐
        Identity ◄──── Org          │           │             │
            ▲           ▲           │           │             │
            │           │           │           │             │
          Task ◄───── Project       │           │             │
            ▲   ▲        ▲          │           │             │
            │   │        │          │           │             │
        Meeting │     Approval    Goal      Document      Communication
            │   │        │          │           │             │
            └───┴────┬───┴────┬─────┴─────┬─────┴──────┬──────┘
                     ▼        ▼           ▼            ▼
   (event consumers, depend on NO domain module — only on the event bus):
        Automation · Notification · Reporting · Audit · Search · Performance · AI
```

Rules:
- Arrows = compile-time dependency (importing a service interface). **No cycles** — enforced by an ESLint boundary rule + dependency-cruiser in CI.
- Foundation (common/config/infra) has no domain deps.
- Cross-cutting consumers (Automation, Notification, Audit, Search, Reporting, Performance, AI) depend **only** on the event bus + contracts — never directly on domain modules — keeping them independently extractable to microservices.
- `Task` may call `Project`/`Org`/`Identity` services (read); reverse is forbidden.

---

## 6. API Versioning Strategy

- **URI versioning**: `/api/v1/...`. NestJS `VersioningType.URI`, default `v1`.
- Additive changes (new fields, new endpoints) ship within the current version — never break consumers; new fields optional.
- Breaking changes → new version namespace (`v2`) running side-by-side; old version supported for a **deprecation window (≥2 quarters)** with `Deprecation` + `Sunset` response headers and changelog.
- Contract source of truth = OpenAPI 3 (auto-generated from controllers/DTOs) → `packages/sdk` regenerated → web consumes typed client. Schema diff check in CI fails the build on accidental breaking change.
- WebSocket events versioned via an `v` field in the event envelope; gateway supports N and N-1.
- Idempotency-Key on all mutating POSTs; cursor pagination standard for large lists.

---

## 7. RBAC Implementation Plan

- **Permission catalog** in `packages/rbac`: enumerated `resource:action` strings + role→permission map + scope rules. Shared by web (UI gating) and api (authoritative).
- **Ability factory** (CASL-style): builds a user's ability from `role` + memberships (dept/team) + `PermissionGrant` (time-boxed) + active `Delegation`. Cached in Redis per user, invalidated on role/membership/grant change.
- **Guards (NestJS, layered):**
  1. `JwtAuthGuard` — authenticates, loads user.
  2. `PermissionsGuard` — checks `@RequirePermission('task:assign')`.
  3. `ScopeGuard` — resolves `@Scope('department'|'team'|'self')`; verifies the target resource is within the user's scope (membership lookup), else 403 + audit.
- **Row-level scoping** at repository layer: every query injects scope predicates (deptIds/teamIds/self) unless caller is GLOBAL. Prevents data leakage even on missed guards (defense in depth).
- **Single Super Admin** invariant enforced by DB partial unique index + service guard.
- **Frontend**: `usePermission()` + `<Can permission="...">` purely for UX; server always re-checks.
- **Auditing**: every authz denial and every grant/delegation change logged.

---

## 8. Meeting Management Architecture

State machine: `CREATED → INVITED → CONDUCTED → MINUTED → CLOSED` (transitions validated server-side; illegal transition → 422).

Flow:
- **Create** → persist Meeting + agenda(JSON); emit `MeetingCreated`.
- **Invite** → MeetingParticipants; Notification module fans invites (in-app/email/calendar ICS); emit `MeetingInvited`.
- **Conduct** → mark attendance; live notes via WS room `meeting:{id}` (collaborative); status CONDUCTED.
- **Minutes** → MOM created manually or via AI (`/ai/mom` → draft, human approves). Status MINUTED.
- **Decisions & Action items** → recorded; each ActionItem can `convert` → creates a Task (1:1 link `ActionItem.taskId`), inheriting assignee/due date; emits `ActionItemCreated`/`TaskCreated`.
- **Close gate** → cannot CLOSE without MOM present (business rule). On close, emit `MeetingClosed` → Automation (follow-ups), Reporting, Performance.
- **Meeting dashboard** read model (cached): upcoming, missed (scheduled past, not conducted), attendance %, pending action items — refreshed on meeting events.
- Recordings stored in S3; `recordingUrl` references signed object.

---

## 9. Notification Architecture

- **Producer**: any domain event → Notification module (event consumer).
- **Resolver**: expands recipients (assignee, watchers, manager, participants) → loads each `NotificationPreference`.
- **Channel fan-out** via dedicated BullMQ queues per channel: `IN_APP` (persist + WS push to `user:{id}`), `EMAIL` (SES), `WHATSAPP` (provider API), `PUSH` (web-push/FCM).
- **Templates**: typed notification templates (title/body) with i18n-ready interpolation.
- **Digest engine**: per-user `digest` pref (INSTANT/HOURLY/DAILY) — non-instant notifications buffered and flushed by a scheduled job; dedup + collapse similar events.
- **Delivery guarantees**: at-least-once with idempotency key per (user,event); retries with backoff; provider failures → DLQ + fallback channel.
- **Rate limiting / fatigue control**: per-user caps; quiet hours; mute-per-resource (e.g. unwatch).
- **Read/unread** tracked; `notification.new` WS event powers the notification center badge.

---

## 10. Event Bus Architecture

- **Transport**: Redis Streams (durable, consumer groups) as the in-process→async backbone; abstracted behind an `EventBus` interface so it can later move to Kafka/SNS-SQS without touching producers.
- **Envelope**: `{ id, type, v, occurredAt, actorId, payload, correlationId, causationId }`. Immutable; serialized via contracts schema.
- **Publish**: domain services publish AFTER the DB transaction commits (transactional outbox pattern — events written to an `outbox` table in the same tx, relayed to the bus by a poller) to guarantee no lost/ghost events.
- **Consumers**: Automation, Notification, Audit, Search, Reporting, Performance — each its own consumer group (independent offsets, independent failure). At-least-once → consumers idempotent (dedup on event id).
- **Ordering**: per-aggregate ordering via stream key = aggregate id where needed.
- **Replay**: events retained N days; consumers can replay (rebuild ES index, recompute metrics).
- **Dead letters**: poison events → DLQ stream + alert.

---

## 11. BullMQ Queue Design

Queues (Redis-backed), each with concurrency + priority + retry policy; workers in `apps/workers`.

| Queue | Purpose | Priority | Retry | Notes |
|---|---|---|---|---|
| `notifications` | channel delivery | high | 5×, expo backoff | sub-queues per channel |
| `digests` | batched notifications | low | 3× | cron-fed |
| `automations` | rule execution | high | 5× | idempotent, DLQ |
| `reports` | PDF/Excel/CSV gen | low | 3× | long-running, store to S3 |
| `ai-jobs` | LLM calls | medium | 3× | rate-limited, streamed results |
| `indexing` | ES sync | medium | 5× | from domain events |
| `recurring-tasks` | RRULE materialization | medium | 3× | nightly + on-demand |
| `escalations` | overdue/SLA checks | high | 3× | scheduled scan |
| `metrics` | performance computation | low | 3× | scheduled rollups |
| `outbox-relay` | event publishing | critical | ∞ w/ backoff | drives the event bus |

Cross-cutting: repeatable (cron) jobs via BullMQ schedulers; job idempotency keys; `QueueEvents` for observability; per-queue dashboards (Bull Board) behind admin auth; graceful shutdown drains in-flight jobs.

---

## 12. Redis Caching Strategy

| Use | Pattern | Invalidation/TTL |
|---|---|---|
| Sessions / refresh allowlist | key per session | TTL = token life; explicit revoke |
| RBAC abilities | `ability:{userId}` | invalidate on role/membership/grant change |
| Dashboard aggregates | `dash:{role}:{scopeId}` (precomputed read models) | refresh on related domain event + short TTL backstop |
| Hot entity reads | cache-aside `task:{id}` etc. | write-through on update, TTL 5m |
| Rate limiting | token-bucket per `user+ip+route` | sliding window |
| Presence | `presence:{room}` sets via pub/sub | ephemeral |
| Idempotency | `idem:{key}` → response | TTL 24h |
| Lists/search results | only stable filters; mostly defer to ES | short TTL |

Principles: cache aggregates and computed views, not raw lists that change constantly. Stampede protection (lock + single-flight). Namespaced keys + versioned prefixes for bulk invalidation. Redis Cluster for HA; cache is never the source of truth (rebuildable).

---

## 13. Elasticsearch Indexing Strategy

- **Indices** (aliased for zero-downtime reindex): `tasks`, `projects`, `documents`, `messages`, `users`, `meetings`.
- **Sync**: domain events → `indexing` queue → upsert/delete docs (eventual). Bulk API for batches. Outbox guarantees no missed updates.
- **Mappings**: analyzed text fields (title/description/body), keyword fields for facets (status, priority, departmentId, assigneeId, tags), date fields for ranges; `departmentId`/`teamId`/scope fields embedded for **scope filtering at query time** (security — search respects RBAC scope).
- **Query**: list endpoints with `q` + filters route to ES (multi-match + filter context + faceted aggregations); pagination via `search_after`.
- **Reindex**: build new index → backfill from Postgres (replay) → swap alias atomically.
- **Consistency**: ES is a read model only; Postgres authoritative. Permission-scoped filters always appended server-side.

---

## 14. Audit Logging Architecture

- **What**: every mutating operation (create/update/delete/transition/decision/grant/login) writes an `AuditLog` row with `actorId, action, resourceType, resourceId, ip, userAgent, before, after, correlationId`.
- **How**: a global NestJS interceptor + explicit domain-event consumer (the `Audit` module subscribes to all domain events) — dual capture so nothing is missed.
- **Integrity**: append-only table (no UPDATE/DELETE grants for app role); periodic **hash-chaining** (each row stores hash of previous) for tamper evidence; monthly partitions; archived to S3/Glacier after retention window.
- **Access**: Super Admin read-only UI + export; queries indexed by `(resourceType,resourceId)`, `actorId`, `createdAt`.
- **Privacy**: PII fields redacted/masked in `before/after` where required.

---

## 15. File Storage Architecture

- **Backend**: S3-compatible object store. Buckets/prefixes by domain: `attachments/`, `documents/`, `recordings/`, `exports/`, `avatars/`.
- **Uploads**: direct-to-S3 via **presigned multipart URLs** (browser → S3, not through API) for large files; API issues the presign + records metadata (`Attachment`/`DocumentVersion`) on completion callback.
- **Downloads**: short-lived presigned GET URLs; access checked against RBAC scope before signing.
- **Versioning**: `Document` → immutable `DocumentVersion` rows (version, checksum, fileUrl); S3 object versioning enabled as backstop.
- **Validation**: MIME/type/size limits, antivirus scan hook (async job) before marking available, checksum verification.
- **Lifecycle**: exports/temp expire (lifecycle rules); recordings tiered to cheaper storage; encryption at rest (KMS), TLS in transit.

---

## 16. Testing Strategy

| Layer | Scope | Tools |
|---|---|---|
| Unit | services, ability factory, state machines, automation rules | Vitest/Jest |
| Integration | controllers + Prisma + Redis against ephemeral DB | Testcontainers (Postgres/Redis/ES) |
| Contract | OpenAPI/SDK + event schemas | schema diff + Pact-style for events |
| E2E (api) | full flows (task lifecycle, meeting→task, approval chain) | Supertest |
| E2E (web) | critical user journeys per role | Playwright |
| Realtime | WS events, presence | socket test harness |
| Load/Perf | 3k concurrent, p95 budgets | k6 |
| Security | SAST/DAST, dependency scan, authz fuzz | Snyk/CodeQL/ZAP |
| Chaos | failure injection on staging | scripted |

Gates: PR requires unit+integration green + coverage ≥80% on changed critical paths + lint + boundary/dep-cruiser check + OpenAPI no-breaking-change. E2E + load run nightly and pre-release. Test data via factories; deterministic seeds.

---

## 17. CI/CD Pipelines

GitHub Actions, Turborepo remote cache, pnpm.

- **PR pipeline**: install → affected build → lint + typecheck → unit + integration (Testcontainers) → boundary/dep check → OpenAPI diff → security scan → preview env (optional). Required to merge.
- **Main pipeline (on merge)**: build → full test → build Docker images (web, api, workers) → push to ECR (tagged by SHA) → deploy to **staging** via Helm → run migrations (`prisma migrate deploy`) → smoke + E2E (Playwright) + k6 baseline.
- **Release pipeline (tag)**: promote the staging-validated image to **prod** → **blue/green** (or canary) deploy → migrate (expand/contract aware) → health checks → automatic rollback on SLO breach.
- Migrations run as a separate pre-deploy Job (ordered, idempotent). Secrets from AWS Secrets Manager via OIDC (no long-lived creds). SBOM + image signing (cosign). Changelog + version bump automated.

---

## 18. Environment Configuration

- **Config schema** validated at boot (zod) in `apps/api/config` and `apps/web` — app refuses to start on invalid/missing config.
- **Environments**: `local` (docker-compose full stack), `dev`, `staging`, `prod` — identical topology, different scale/secrets.
- **Sources**: `.env` for local only; cloud envs pull from **AWS Secrets Manager / SSM Parameter Store** injected at runtime (never baked into images). Per-env Terraform supplies infra endpoints.
- **Key groups**: `DATABASE_URL`, `REDIS_URL`, `ELASTICSEARCH_URL`, `S3_*`, `JWT_*` (RS256 key pair), `MFA_*`, `SES_*`, `WHATSAPP_*`, `AI_API_KEY`/model ids, `FEATURE_FLAGS`, `WS_ORIGIN`, `RATE_LIMITS`.
- **Feature flags** service (e.g. Unleash/db-backed) for progressive rollout, decoupled from deploy.
- 12-factor: config in env, stateless processes, separate build/release/run.

---

## 19. Production Deployment Strategy

- **Platform**: AWS EKS. Separate deployments: `web`, `api`, `ws-gateway`, `workers` (per-queue scalable), `cron`. HPA on CPU + custom metrics (queue depth, WS connections, p95 latency).
- **Data tier**: RDS PostgreSQL Multi-AZ + read replicas + PgBouncer; ElastiCache Redis (cluster mode); OpenSearch; S3. All in private subnets.
- **Edge**: Route53 → CloudFront → WAF → ALB. TLS termination at ALB/CF.
- **Release**: blue/green via two target groups; canary option (weighted) for risky changes; feature-flag dark launches. DB migrations expand→migrate→contract for zero downtime.
- **Rollback**: image is immutable + versioned; rollback = shift traffic to previous green + (rarely) contract-migration reversal plan documented per release.
- **SRE**: SLOs (uptime 99.9%, p95<300ms), on-call + runbooks, alerting (Prometheus/Alertmanager → PagerDuty), error budget policy.
- **DR**: Multi-AZ + cross-region read replica + PITR; RTO<1h/RPO<5min; quarterly restore drills.
- **Rollout to org**: pilot department → 25% → 100%, with legacy-data migration jobs and training.

---

## 20. Infrastructure as Code Architecture

- **Terraform** (state in S3 + DynamoDB lock), structured as reusable **modules** (`vpc`, `eks`, `rds`, `elasticache`, `opensearch`, `s3`, `iam`, `cloudfront-waf`, `secrets`, `observability`) composed per env under `infra/terraform/envs/{dev,staging,prod}`.
- **Helm** charts (`infra/helm/sarion`) deploy app workloads (web/api/ws/workers/cron) with per-env `values-*.yaml`; templated HPA, probes, resources, config/secret refs (External Secrets Operator → Secrets Manager).
- **GitOps optional**: ArgoCD watches the Helm release for prod (declarative, drift detection).
- **Policy/quality**: `terraform plan` + `tflint` + `checkov` (security policy) in CI; manual approval gate for prod apply. Atlantis or CI-driven apply.
- **Observability as code**: Prometheus/Grafana/Loki/OTel collector + dashboards/alerts provisioned via Terraform/Helm.
- **Network/security**: VPC with public (edge) + private (app) + isolated (data) subnets, security groups least-privilege, IAM via OIDC roles, KMS keys per data store — all codified.

---

## Implementation Sequence (build order to production)

Strict order; each step gated by tests + the prior step. Mirrors `10-ROADMAP-SPRINTS.md` at engineering granularity.

**Foundation (must come first)**
1. Monorepo scaffold: pnpm workspaces, Turborepo, ESLint/TS configs, `packages/contracts` + `packages/rbac` skeletons.
2. Local infra: docker-compose (Postgres, Redis, ES, S3/MinIO, mailhog). Config schema + boot validation.
3. NestJS `infra` layer: Prisma, Redis, BullMQ, ES, S3, WS clients + health checks.
4. Prisma schema + migrations 0001→0017 (order in §2) + seed (Super Admin, departments, workflows).
5. Event bus + transactional **outbox** + `outbox-relay` worker (everything async depends on this).
6. Audit module (consumes all events) + global audit interceptor — wired before features so all later work is audited.

**Identity & access (gates everything user-facing)**
7. Identity module: auth (login, Argon2id, JWT RS256, refresh rotation, sessions), MFA, IP allowlist.
8. `packages/rbac`: permission catalog + ability factory + Redis cache; `JwtAuthGuard`/`PermissionsGuard`/`ScopeGuard`; repository scope predicates.
9. Web app shell: Next.js layout, auth flow, `usePermission`/`<Can>`, command palette, design system, API SDK generation from OpenAPI.

**Org (data backbone)**
10. Org module: departments, teams, membership, configurable hierarchy + UI (admin). Employee profiles + lifecycle. People directory.

**Work core (MVP)**
11. Task module: CRUD with required-field accountability, state machine + transitions, subtasks, dependencies (DAG cycle check), checklist, watchers, comments, attachments (presigned S3), activity, templates, bulk assign.
12. Search module: ES indices + `indexing` worker; wire task/project/doc search.
13. Project module: projects, sprints, the 6 board views; realtime board via WS room.
14. Notification module + queues (in-app/email first) + preferences; wire task/meeting events.
15. Dashboards: cached read models (Owner/MD/Dept/Employee) + realtime refresh. **→ MVP / pilot launch.**

**Collaboration**
16. Meeting module: state machine, invite (ICS), attendance, MOM, decisions, action-item→task conversion, meeting dashboard, recordings.
17. Approval module: workflow engine, requests/steps, escalation queue, notifications.
18. Communication (channels/messaging/mentions) + Document module (versioned KB, S3 versioning).

**Intelligence & ops**
19. Automation engine + no-code builder + reference automations (onboarding, overdue escalation, meeting follow-ups); `automations`/`escalations`/`recurring-tasks` workers.
20. Reporting module + `reports` worker (PDF/Excel/CSV → S3) + scheduled reports.
21. Performance module: metric computation jobs (`metrics` queue) + employee/department views.
22. AI module: `/ai/*` endpoints, RAG over scoped ES/Postgres, guardrails, `ai-jobs` worker, AI drawer streaming.

**Channels & hardening**
23. Notification channels: WhatsApp + web-push + digest engine.
24. Full WhatsApp/email templates, i18n, accessibility (AA) pass.
25. Observability (Prometheus/Grafana/Loki/OTel), Bull Board, audit hash-chaining.
26. Performance/load tuning (k6 to 3k concurrent), read replicas, partitioning live, cache aggregates.
27. Security: pen-test, SAST/DAST gates, field-level encryption, IP/session controls, DR restore drill.
28. IaC complete (Terraform envs + Helm + External Secrets + ArgoCD), CI/CD release pipeline, blue/green.
29. **Production rollout**: pilot dept → 25% → 100%, legacy data migration, training, on-call/SLOs live. **→ GA.**
