# Sarion OS — RBAC & Permission Matrix

## 1. Model

Permissions use **Role + Scope + Resource-Action** (RBAC with hierarchical scope).

- **Roles:** `SUPER_ADMIN`, `MANAGING_DIRECTOR`, `DEPARTMENT_HEAD`, `TEAM_LEAD`, `EMPLOYEE`, `GUEST`.
- **Scope:** `GLOBAL`, `DEPARTMENT`, `TEAM`, `SELF`.
- **Permission string:** `resource:action` e.g. `task:assign`, `meeting:create`, `user:remove`.
- A user's effective permissions = role permissions ∩ scope, plus any explicit grants/overrides.

Only **one** `SUPER_ADMIN` may exist (enforced by unique partial constraint).

## 2. Permission Matrix

Legend: ✅ full · 🟡 scoped (own dept/team/self) · 👁 read-only · ❌ none

| Capability | Super Admin | Managing Dir | Dept Head | Team Lead | Employee | Guest |
|---|:--:|:--:|:--:|:--:|:--:|:--:|
| Manage departments | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Create teams | ✅ | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| Add / remove users | ✅ | ❌ | 🟡 | ❌ | ❌ | ❌ |
| Manage permissions/roles | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Manage automations | ✅ | 🟡 | 🟡 | ❌ | ❌ | ❌ |
| View all departments | ✅ | ✅ | 🟡 | 🟡 | 🟡 | 👁 |
| Company analytics | ✅ | ✅ | 👁 | ❌ | ❌ | ❌ |
| Create company goals/OKRs | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create dept/team goals | ✅ | ✅ | 🟡 | 🟡 | ❌ | ❌ |
| Create company meetings | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create department meetings | ✅ | ✅ | 🟡 | ❌ | ❌ | ❌ |
| Run team meetings | ✅ | ✅ | 🟡 | 🟡 | ❌ | ❌ |
| Create strategic initiatives | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Create projects | ✅ | ✅ | 🟡 | ❌ | ❌ | ❌ |
| Assign projects | ✅ | ✅ | 🟡 | ❌ | ❌ | ❌ |
| Create / assign tasks | ✅ | ✅ | 🟡 | 🟡 | ❌ | ❌ |
| Update own task status | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Approve budgets | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ |
| Approve major decisions | ✅ | ✅ | 🟡 | ❌ | ❌ | ❌ |
| Review employee performance | ✅ | ✅ | 🟡 | 🟡 | ❌ | ❌ |
| Upload documents | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| Submit requests/approvals | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ |
| View assigned work | ✅ | ✅ | ✅ | ✅ | ✅ | 👁 |
| Audit logs | ✅ | 👁 | ❌ | ❌ | ❌ | ❌ |
| IP / session / security config | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

## 3. Enforcement

- **Backend:** NestJS `@Roles()` + `PermissionsGuard` + `ScopeGuard` (resolves dept/team membership). Policy checks centralised in a `CASL`-style ability factory.
- **Frontend:** `usePermission('task:assign')` hook gates UI; never the sole control — server is authoritative.
- **Row-level scope:** queries filtered by org-scope (department/team membership) at the repository layer.

## 4. Delegation & Overrides

- Super Admin may grant temporary elevated permissions (time-boxed `permission_grants` with `expires_at`).
- Acting/delegate roles supported when a manager is on leave (`delegations` table).
