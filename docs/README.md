# Sarion OS — Design & Architecture Package

Production-ready design documentation for **Sarion OS**, an enterprise company-wide work management, execution, meeting, employee, project, and accountability platform for Sarion. Built for 10,000+ users.

## Documents
| # | Doc | Covers |
|---|---|---|
| 00 | [PRD](00-PRD.md) | Vision, goals, personas, scope, principles, risks |
| 01 | [Features & User Stories](01-FEATURES-USER-STORIES.md) | Full feature list + seed backlog with acceptance criteria |
| 02 | [Permission Matrix](02-PERMISSION-MATRIX.md) | RBAC model + role × capability matrix + enforcement |
| 03 | [Database Schema](03-DATABASE-SCHEMA.prisma) | Complete Prisma/PostgreSQL schema, all modules |
| 04 | [ERD](04-ERD.md) | Entity relationships (Mermaid) + integrity rules |
| 05 | [API Spec](05-API-SPEC.md) | REST + WebSocket contracts, conventions, errors |
| 06 | [Architecture](06-ARCHITECTURE.md) | System topology, modular-monolith→microservices, auth/notification arch |
| 07 | [Frontend & UX](07-FRONTEND-UX.md) | Navigation, role dashboards, screens, components |
| 08 | [Automation & AI](08-AUTOMATION-AI.md) | Automation engine + Sarion AI assistant |
| 09 | [Deployment & Security](09-DEPLOYMENT-SECURITY.md) | AWS/K8s deployment, scalability, security plan |
| 10 | [Roadmap & Sprints](10-ROADMAP-SPRINTS.md) | Phased dev plan, sprints, release plan |
| 11 | [Technical Design Spec (TDS)](11-TDS.md) | Engineering blueprint: monorepo, migrations, DDD, event bus, queues, caching, ES, audit, storage, testing, CI/CD, IaC + full build sequence |
| 12 | [Implementation Plan](12-IMPLEMENTATION-PLAN.md) | 8 phases × 12 dimensions (FS/DB/API/SVC/FE/CMP/PERM/EVT/NOTIF/TEST/AC/DEPLOY) + estimates + execution checklist |
| 13 | [Design System & UI/UX](13-DESIGN-SYSTEM.md) | Dark Navy Enterprise: color/type/spacing/motion tokens, app shell, dashboards, all module UX, ShadCN map, responsive, a11y, Figma structure — tokens wired into `apps/web` |

## Tech stack
Next.js · TypeScript · Tailwind · ShadCN · NestJS · PostgreSQL · Redis · BullMQ · Elasticsearch · S3 · WebSockets · Docker · Kubernetes · AWS · Claude (AI).

## How to use
1. Read PRD → Architecture → Schema for the system model.
2. Permission Matrix + API Spec define the contract for backend implementation.
3. Frontend/UX defines the client.
4. Roadmap sequences delivery: **MVP = Phases 0–3** (auth, org, tasks, projects, dashboards).

> Next step: scaffold the monorepo (Phase 0) — say the word and I'll generate the NestJS + Next.js skeleton, Prisma migration, and auth/RBAC module to start Phase 0.
