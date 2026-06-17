# Sarion OS — Deployment, Scalability & Security

## 1. Deployment architecture (AWS)

```
Route53 ─► CloudFront (CDN) ─► WAF ─► ALB
                                  ├─► EKS: Next.js pods (HPA)
                                  └─► EKS: NestJS API pods (HPA)
EKS also runs: BullMQ workers, WebSocket gateway, AI service, cron jobs.
Data: RDS PostgreSQL (Multi-AZ + read replicas, PgBouncer) · ElastiCache Redis (cluster)
      · OpenSearch · S3 · SES · Secrets Manager
CI/CD: GitHub Actions ─► build/test ─► ECR ─► Helm ─► EKS (blue/green)
```

- **Containerization:** Docker images per service. **Orchestration:** Kubernetes (EKS) with Helm charts, HPA on CPU+custom metrics (queue depth, WS connections).
- **Environments:** dev → staging → prod, IaC via Terraform. Separate VPCs; private subnets for data tier.
- **Releases:** blue/green or canary; DB migrations via Prisma migrate gated in pipeline; feature flags for progressive rollout.

## 2. Scalability plan (10,000+ users)

| Layer | Strategy |
|---|---|
| Web/API | Stateless pods, horizontal autoscale behind ALB; CDN for static/RSC |
| WebSocket | Dedicated gateway pods, Redis adapter for multi-node fan-out; sticky-less via shared pub/sub |
| DB | Read replicas for analytics/dashboards; PgBouncer pooling; partition AuditLog/Activity/Notification by month; archival to S3/Glacier |
| Cache | Redis cluster: sessions, rate-limit, dashboard aggregates, presence |
| Async | BullMQ worker pools autoscaled by queue depth; priority queues (notifications > reports) |
| Search | OpenSearch cluster, async indexing pipeline |
| Files | S3 + CloudFront signed URLs; direct-to-S3 multipart uploads |
| Capacity target | 3,000 concurrent, p95 API < 300ms, dashboard < 1.5s |

Load/perf tested with k6; chaos testing on staging.

## 3. Security plan

- **AuthN:** Argon2id passwords, MFA (TOTP), OIDC SSO, refresh-token rotation + reuse detection, session revocation, device list.
- **AuthZ:** RBAC + scope guards (see `02-PERMISSION-MATRIX.md`), repository-level row scoping, deny-by-default.
- **Network:** WAF (OWASP rules), rate limiting, IP allowlists for admin, private data subnets, security groups, TLS 1.2+ everywhere.
- **Data:** encryption at rest (KMS) for RDS/S3/Redis, encryption in transit, field-level encryption for sensitive PII, PII redaction in logs/AI context.
- **Audit:** immutable `AuditLog` (before/after) on every mutation; tamper-evident (append-only, periodic hash chaining); exportable for compliance.
- **Secrets:** AWS Secrets Manager / SSM; no secrets in code; rotation.
- **Backups/DR:** automated RDS snapshots + PITR, cross-region replication, S3 versioning, documented RTO < 1h / RPO < 5min, periodic restore drills.
- **AppSec:** input validation (zod), output encoding, CSRF protection (httpOnly+SameSite cookies), security headers/CSP, dependency scanning (Dependabot/Snyk), SAST/DAST in CI, pen-test before GA.
- **Compliance posture:** least-privilege IAM, access reviews, data retention policies, GDPR-style data export/delete tooling.
