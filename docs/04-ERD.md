# Sarion OS — Entity Relationship Diagram

```mermaid
erDiagram
    User ||--o{ User : "manages (org hierarchy)"
    Department ||--o{ User : "has members"
    Department ||--o{ Team : "has"
    Team ||--o{ TeamMember : "has"
    User ||--o{ TeamMember : "joins"
    User ||--o{ PermissionGrant : "granted"

    Department ||--o{ Project : "owns"
    Project ||--o{ Sprint : "has"
    Project ||--o{ Task : "contains"
    Task ||--o{ Task : "subtasks"
    Task ||--o{ TaskDependency : "depends"
    Task ||--o{ ChecklistItem : "has"
    Task ||--o{ TaskWatcher : "watched by"
    Task ||--o{ Comment : "has"
    Task ||--o{ Activity : "logs"
    Task ||--o{ Attachment : "has"
    User ||--o{ Task : "owns / assigned"

    Department ||--o{ Meeting : "holds"
    Meeting ||--o{ MeetingParticipant : "invites"
    Meeting ||--|| MeetingMinutes : "produces"
    Meeting ||--o{ Decision : "records"
    Meeting ||--o{ ActionItem : "creates"
    ActionItem ||--o| Task : "converts to"

    ApprovalWorkflow ||--o{ ApprovalRequest : "instantiates"
    ApprovalRequest ||--o{ ApprovalStep : "has"
    User ||--o{ ApprovalRequest : "requests"

    Department ||--o{ Goal : "has"
    Goal ||--o{ KeyResult : "has"
    Goal ||--o{ Goal : "cascades"

    Document ||--o{ DocumentVersion : "versions"
    User ||--o{ Notification : "receives"
    User ||--|| NotificationPreference : "configures"
    Automation ||--o{ AutomationRun : "executes"
    User ||--o{ AuditLog : "acts"
    User ||--o{ Session : "owns"
    Channel ||--o{ Message : "contains"
```

## Key relationships & integrity rules

- **Org hierarchy** is self-referential on `User.managerId`; cycles prevented in service layer.
- **One Super Admin**: enforced by unique partial index `WHERE role='SUPER_ADMIN'`.
- **ActionItem ↔ Task** is 1:1 (`ActionItem.taskId @unique`) — converting an action item creates exactly one tracked task.
- **Soft delete** (`deletedAt`) on User, Department, Project, Task, Document; queries filter by default.
- **Dependencies** form a DAG; cycle check before insert into `TaskDependency`.
- **Goal cascade** via `parentGoalId` lets company → dept → team → employee OKRs roll up.
- **Read models**: Tasks, Projects, Documents, Messages projected into Elasticsearch for search/filter; dashboards read from Redis-cached aggregates refreshed by workers + invalidated on writes.
