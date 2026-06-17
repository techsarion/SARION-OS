# Sarion OS — Frontend & UX Structure

## 1. Stack & foundations
Next.js 15 (App Router, RSC), TypeScript, Tailwind, ShadCN UI, TanStack Query (server state), Zustand (local UI), socket.io client (realtime), react-hook-form + zod. Design tokens for theming; dark/light. PWA (installable, offline read cache).

## 2. Navigation structure (global shell)
```
Top bar: [Global search ⌘K] [Create + ] [AI ✦] [Notifications] [Profile]
Left rail (role-aware):
  ▸ Home / My Dashboard
  ▸ Tasks            (My tasks, Assigned by me, All — scoped)
  ▸ Projects         (board switcher: List/Kanban/Calendar/Timeline/Gantt/Workload)
  ▸ Meetings         (Upcoming, Calendar, MOM library, Action items)
  ▸ Goals & OKRs
  ▸ Approvals        (My requests, Awaiting me)
  ▸ Departments / Teams
  ▸ People           (Employee directory + profiles)
  ▸ Documents        (Knowledge base)
  ▸ Reports
  ▸ Performance
  ▸ Admin            (RBAC, Automations, Security, Audit) — Super Admin only
```
Left rail items render only if the user holds the relevant permission (`usePermission`).

## 3. Role-based dashboards

**Owner Dashboard** — company health score, revenue/KPI tiles, open vs delayed projects, department performance heatmap, employee performance leaderboard, pending approvals, upcoming meetings, AI executive summary card.

**Managing Director** — strategic initiatives kanban, department KPI scorecards, meeting outcomes & action-item completion, budget approvals queue.

**Department Dashboard** — team workload bars, active projects, delays & blockers, goal progress, upcoming dept meetings.

**Employee Dashboard** — My tasks (Due today / Overdue / Upcoming), my meetings, pending approvals, my goals, recent mentions.

## 4. Key screens

- **Task drawer/page:** all fields, status stepper (Draft→…→Completed), subtasks, checklist, dependencies graph, watchers, activity timeline, comments with @mentions, attachments, approval badge.
- **Project board:** view switcher; Kanban with WYSIWYG drag (realtime); Gantt with dependencies; Workload view (capacity per assignee).
- **Meeting workspace:** agenda builder → live notes → "Generate MOM (AI)" → decisions list → action items (each with "Convert to task") → attendance → close gate.
- **Approval flow:** visual step chain with current position, approve/reject + comment.
- **Goal/OKR tree:** cascade view company→dept→team→employee with progress rings + confidence.
- **AI panel (✦):** ask, generate tasks from goal, summarize, draft MOM, exec summary — context-aware to current screen.

## 5. UX principles
Required-field enforcement on task/meeting creation (accountability). Optimistic UI + realtime reconciliation. Keyboard-first (⌘K command palette, quick-create). Skeleton loaders, empty states with CTA, inline validation. Accessibility AA. Bulk actions on lists. Saved filters/views per user.

## 6. Component inventory (ShadCN-based)
DataTable (virtualized), KanbanBoard, GanttChart, CalendarView, WorkloadHeatmap, StatusStepper, PriorityBadge, UserAvatarStack, MentionInput, FileDropzone, ApprovalChainViz, OKRTree, MetricTile, ActivityTimeline, NotificationCenter, CommandPalette, AIAssistantDrawer.
