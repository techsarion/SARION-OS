# Sarion OS — System Architecture

## 1. Topology (high level)

```
                    ┌───────────────┐
   Browsers/PWA ──► │  CDN + WAF     │ ──► Next.js (SSR/edge) ──┐
                    └───────────────┘                          │
                                                               ▼
                                            ┌──────────────────────────┐
                                            │  API Gateway / BFF        │  (auth, rate-limit, routing)
                                            └──────────────┬───────────┘
        ┌──────────────┬──────────────┬──────────────┬────┴─────────┬──────────────┐
        ▼              ▼              ▼              ▼              ▼              ▼
   Identity svc   Task/Project   Meeting svc    Approval svc   Notification   AI svc
   (RBAC/auth)    svc            (MOM/actions)  (workflow)     svc            (LLM)
        └──────────────┴──────────────┴──────────────┴──────────────┴──────────────┘
                 │ Postgres (primary+replicas) │ Redis │ BullMQ │ Elasticsearch │ S3 │
                 └──────────────────────────────WebSocket Gateway──────────────────┘
```

## 2. Style

**Modular monolith first, microservices-ready.** Single NestJS deployment partitioned into bounded-context modules (identity, org, task, project, meeting, approval, goal, performance, document, notification, automation, reporting, ai, audit). Each module owns its tables and exposes an internal service interface. Communication is in-process now; extractable to independent services later via the same contracts (events on a message bus). This avoids premature distributed-systems cost while keeping the seams clean for 10k-user scale.

**Event backbone:** Domain events (`TaskAssigned`, `MeetingClosed`, `EmployeeJoined`, `TaskOverdue`, `ApprovalDecided`) published to Redis Streams / BullMQ; consumed by Automation, Notification, Reporting, AI, and Audit modules. Enables decoupling and async fan-out.

## 3. Components

| Concern | Tech | Role |
|---|---|---|
| Frontend | Next.js 15 (App Router) + TS + Tailwind + ShadCN | SSR dashboards, RSC, PWA |
| API | NestJS | REST + WS gateway, guards, validation (zod/class-validator) |
| DB | PostgreSQL 16 (primary + read replicas) | source of truth, RLS-style scoping |
| Cache | Redis | sessions, rate-limit, dashboard aggregates, pub/sub presence |
| Queue | BullMQ (Redis) | notifications, reports, automations, AI jobs, recurring tasks (RRULE) |
| Search | Elasticsearch | task/project/doc/message search + filtered lists |
| Storage | S3-compatible | attachments, documents, recordings |
| Realtime | WebSockets (socket.io) | live boards, dashboards, notifications, presence |
| AI | LLM service (Claude) | summaries, MOM, planning, risk/delay prediction |

## 4. Data & scaling

- **Reads:** dashboards served from Redis-cached aggregates (refreshed by workers on domain events + TTL). Search/lists from Elasticsearch. Heavy reports run async → S3 → signed URL.
- **Writes:** Postgres with connection pooling (PgBouncer). Partition high-volume tables (`AuditLog`, `Activity`, `Notification`) by month. Read replicas for analytics.
- **Hot paths indexed** (see schema `@@index`). N+1 avoided via DataLoader/batched queries.
- **Multi-tenant-safe scoping** enforced at repository layer (department/team predicates) + guard layer.

## 5. Authentication architecture

- Access JWT (15m) signed RS256; refresh token rotation with reuse-detection; sessions table for revocation. MFA (TOTP). OIDC SSO pluggable. IP allowlist + device/session management. Passwords Argon2id.

## 6. Notification architecture

Producer (domain event) → Notification module fans out per user `NotificationPreference` across IN_APP (WS + persisted), EMAIL (SES), WHATSAPP (provider API), PUSH (web-push). Digest batching via scheduled BullMQ jobs. Dedup + rate-limit to prevent fatigue.

## 7. Observability & resilience

- Structured logs (pino) → ELK. Metrics (Prometheus) + Grafana. Tracing (OpenTelemetry). Health/readiness probes.
- Circuit breakers on external providers; retries with backoff + dead-letter queues. Graceful degradation (e.g. AI optional).
