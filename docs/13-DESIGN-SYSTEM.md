# Sarion OS — Design System & UI/UX Architecture

> **"Sarion Graphite."** Palette derived directly from the Sarion logo (`/public`): an **electric-blue → cyan** hexagonal "S" gradient on a deep, neutral-cool graphite base. Dark-only, desktop-first, tablet/mobile responsive. Premium, fast, executive-grade. Sharp & precise — **2px border radius globally** (no rounded cards, no pills). Implementation target: Next.js 15 (App Router) + Tailwind + ShadCN. Tokens are wired into the codebase — see `app/globals.css` and `tailwind.config.ts`. Reference inspirations: Linear, Stripe Dashboard, Vercel, Notion, Attio, Arc, Raycast.

---

## 1. Design Principles

1. **Calm density** — show a lot, feel uncluttered. Generous spacing, restrained color, one accent.
2. **Speed is a feature** — optimistic UI, instant navigation, keyboard-first, command palette everywhere.
3. **Hierarchy through depth & type, not borders** — elevation/glow over heavy lines.
4. **One accent, semantic color discipline** — blue is the brand; success/warning/danger/info only carry meaning.
5. **Every surface is actionable** — hover affordances, inline edit, right-click/quick actions.
6. **Accessible by default** — WCAG AA contrast, focus-visible rings, full keyboard paths.

---

## 2. Color System (tokens)

### Core palette (deep neutral-cool graphite)
| Token | Hex | Use |
|---|---|---|
| `--bg` | `#0A0C10` | App background (deepest) |
| `--surface` | `#0E1117` | Primary surface / page |
| `--surface-2` | `#121620` | Sidebar / secondary surface |
| `--card` | `#151A23` | Cards, popovers, menus |
| `--card-2` | `#1A2029` | Nested / hover surface |
| `--border` | `#232A35` | Hairline borders, dividers |
| `--border-strong` | `#2F3744` | Inputs, emphasized borders |
| `--text` | `#F6F8FB` | Primary text |
| `--text-2` | `#9AA4B2` | Secondary text |
| `--text-muted` | `#69727F` | Muted/placeholder |

### Brand accent & semantic (from logo)
| Token | Hex | Use |
|---|---|---|
| `--accent` | `#2F80F7` | Primary actions, links, focus — **logo royal blue** |
| `--accent-hover` | `#4A90F8` | Hover state |
| `--accent-press` | `#1F6FE6` | Active/press state |
| `--accent-cyan` | `#1FC8E6` | Secondary brand — **logo cyan terminus** |
| `--brand-gradient` | `linear-gradient(135deg,#2F80F7,#1FC8E6)` | Logo wordmark, gauges, hero accents (used sparingly) |
| `--success` | `#34B87A` | Completed, healthy, positive Δ |
| `--warning` | `#E0A93B` | At-risk, due-soon |
| `--danger` | `#E5484D` | Overdue, blockers, destructive |
| `--info` | `#1FC8E6` | Informational (shares brand cyan) |

> **No generic SaaS blue.** The accent is the logo's electric blue, paired with its cyan terminus. The graphite base is intentionally near-neutral (Linear/Vercel grade) so the brand blue/cyan reads as the single accent.

### Derived tokens (computed)
- **Accent scales**: `accent-soft` = `rgba(47,128,247,.10)` (chips/active nav bg), `accent-soft-2` = `rgba(47,128,247,.16)`, `glow` = `0 0 0 1px rgba(47,128,247,.45), 0 4px 20px -6px rgba(47,128,247,.4)`.
- **Semantic soft fills** (badges): each semantic at 12% alpha bg + full-strength text.
- **Elevation overlays**: hover surfaces lighten via `rgba(255,255,255,.03→.06)` overlay, never a new hue.
- **Priority colors**: P0 `--danger`, P1 `--warning`, P2 `--accent`, P3 `--text-muted`.
- **Status colors**: Draft muted · Assigned info · In-Progress accent · Review warning · Approved success · Completed success-dim.

### Contrast rules
Primary text on every surface ≥ 7:1; secondary ≥ 4.5:1; muted reserved for non-essential. Accent text on dark passes AA at ≥14px bold / ≥16px regular.

---

## 3. Typography System

**Font**: `Inter` (UI) + `Geist Mono` / `JetBrains Mono` (numbers, code, IDs). Variable font, `font-feature-settings: 'cv11','ss01'; 'tnum'` for tabular numerals in tables/metrics.

| Token | Size / Line | Weight | Use |
|---|---|---|---|
| `display` | 32 / 40 | 700 | Dashboard hero metric |
| `h1` | 24 / 32 | 600 | Page title |
| `h2` | 20 / 28 | 600 | Section title |
| `h3` | 16 / 24 | 600 | Card title |
| `body` | 14 / 22 | 400 | Default body |
| `body-sm` | 13 / 20 | 400 | Secondary |
| `caption` | 12 / 16 | 500 | Labels, meta |
| `overline` | 11 / 16 | 600, +0.06em, uppercase | Eyebrows, table headers |
| `mono` | 13 / 20 | 500 | IDs, counts, KPIs |

Rules: max 2 weights per view; numbers tabular; titles `tracking-tight`; never below 11px.

---

## 4. Spacing, Radius, Elevation, Motion

**Spacing** (4px base): `0,2,4,6,8,12,16,20,24,32,40,48,64`. Page gutter desktop 32, tablet 24, mobile 16. Card padding 20. Section gap 24.

**Radius**: **2px globally — this is a hard cap.** Every surface (inputs, buttons, cards, panels, modals, badges, chips) uses `2px`. No rounded cards, no pill buttons, no excessive curves — the language is sharp, precise, enterprise. `full` is reserved exclusively for circular avatars and status dots. (All Tailwind radius tokens `sm/md/lg/xl/2xl` are mapped to `2px` so existing utilities stay on-system.)

**Elevation** (shadows tuned for dark):
- `e0` flat (on bg).
- `e1` card: `0 1px 2px rgba(0,0,0,.4), 0 1px 1px rgba(0,0,0,.3)` + 1px border.
- `e2` popover/menu: `0 8px 24px -8px rgba(0,0,0,.6)`.
- `e3` modal: `0 24px 64px -16px rgba(0,0,0,.7)` + backdrop blur.
- `glow` focus/active: accent-glow.

**Motion**: durations `fast 120ms`, `base 180ms`, `slow 240ms`; easing `cubic-bezier(.2,.8,.2,1)` (enter), `cubic-bezier(.4,0,1,1)` (exit). Respect `prefers-reduced-motion`. See §13.

---

## 5. App Shell & Layout

```
┌──────────────────────────────────────────────────────────────────────┐
│ TOPBAR  [≡] Sarion◆   [⌘K Search…]      [+ Quick]  [✦ AI]  [🔔]  [Avatar▾] │
├───────────┬──────────────────────────────────────────────────────────┤
│ SIDEBAR   │  PAGE HEADER   title · breadcrumbs · view-switch · actions │
│ (collap-  │ ─────────────────────────────────────────────────────────│
│  sible)   │                                                            │
│  nav…     │  CONTENT (cards / board / table / detail)                  │
│           │                                                            │
└───────────┴──────────────────────────────────────────────────────────┘
```

- **Grid**: 12-col fluid, max content width 1440 (dashboards) / full-bleed (boards). Left sidebar 264px expanded / 72px collapsed (icon-rail). Topbar 56px. Page header 64px sticky.
- **Logo**: top-left of sidebar — `◆ Sarion` wordmark (diamond glyph in accent gradient). Collapses to glyph only. Always links Home.
- **Surfaces stack**: `bg` → sidebar `surface-2` → content cards `card` on `surface`.

### Topbar
Left: sidebar toggle + logo. Center: global search (`⌘K`). Right: Quick Actions (`+`), AI (`✦`), Notifications (`🔔` with unread dot), User menu (avatar).

### Sidebar
Collapsible (persist state). Sections grouped with overline labels. Active item: accent-soft bg + left 2px accent bar + accent icon. Hover: surface lighten. Badges (counts) right-aligned. Bottom: workspace switcher + collapse control.

---

## 6. Navigation Structure & Icons

| Item | Icon (lucide) | Group |
|---|---|---|
| Dashboard | `layout-dashboard` | Overview |
| Command Center | `radar` | Overview |
| Tasks | `check-square` | Work |
| Projects | `kanban-square` | Work |
| Meetings | `calendar-clock` | Work |
| Approvals | `badge-check` | Work |
| Goals & OKRs | `target` | Strategy |
| Departments | `building-2` | Org |
| Teams | `users` | Org |
| Employees | `user-round` | Org |
| Knowledge Base | `book-open` | Knowledge |
| Documents | `file-text` | Knowledge |
| Reports | `bar-chart-3` | Insights |
| Automation | `workflow` | Platform |
| AI Assistant | `sparkles` | Platform |
| Settings | `settings` | Platform |

Hierarchy: 5 overline groups (Overview · Work · Strategy/Org · Knowledge/Insights · Platform). Role-aware: items render only with permission; Command Center = Owner/MD only.

---

## 7. Global Interactions

- **Command Palette (`⌘K`)**: fuzzy search across navigation, entities (tasks/projects/people/docs), and actions ("Create task", "Invite user"). Recent + suggested. Arrow-key nav, scoped result groups, inline create.
- **Global Search**: same input; full-page results with facets (type, department, date) backed by Elasticsearch.
- **Quick Actions (`+`)**: New Task / Project / Meeting / Goal / Document / Invite — opens the right modal, context-prefilled.
- **Notification Center (`🔔`)**: right slide-over inbox (see §16).
- **User Menu**: profile, preferences, theme, keyboard shortcuts, status (active/away), sign out.

Keyboard map: `⌘K` palette · `C` then `T/P/M` quick-create · `G` then `D/T/P` go-to · `J/K` list nav · `X` select · `E` edit · `/` search · `?` shortcuts.

---

## 8. Dashboards

### Owner Dashboard
Hero row: **Company Health Score** (large radial gauge + trend) · Revenue Snapshot · Meeting Compliance · Team Utilization. Then grid:
- **Department Performance** — heatmap/bar matrix (goal%, budget, productivity).
- **Critical Risks** — ranked list with severity chips + owners.
- **Overdue Tasks** — count + drill list.
- **Approvals Pending** — queue with one-click approve.
- **Upcoming Meetings** — timeline strip.
- **Productivity Analytics** — area chart (throughput, cycle time).
- **Recent Activities** — live feed.

Layout: 4-up KPI tiles (each `card`, e0→e1 on hover), then 2-col (8/4) widget grid; charts use accent + semantic only.

### Managing Director
Strategic Projects (portfolio kanban/status) · Department Status scorecards · Meeting Outcomes (action-item completion) · Escalations · Executive Actions queue · Budget Reviews · Risk Analysis.

### Department Dashboard
Department KPIs row · Team Workload (capacity bars) · Active Projects · Upcoming Meetings · Goals progress · Performance.

### Employee Dashboard
My Tasks (Overdue / Due Today / Upcoming tabs) · Upcoming Meetings · Announcements · Recent Activity · Performance Summary (completion, timeliness, quality rings).

**KPI tile anatomy**: overline label · big tabular value · Δ vs prior (success/danger) · sparkline · click → drill. Skeleton on load.

---

## 9. Task Management UX

- **Views switcher** (segmented control): List · Kanban · Calendar · Timeline · Workload.
- **List**: virtualized DataTable; inline edit (status, assignee, priority, due); multi-select → bulk action bar (assign, status, priority, delete); saved views & filters; group-by; sticky header; row hover reveals quick actions.
- **Kanban**: columns = status; drag-drop (smooth, optimistic, realtime); WIP counts; card shows priority bar, title, assignee avatar, due chip, subtask/▢ progress, tags.
- **Calendar / Timeline**: due-date calendar; Gantt timeline with dependency arrows + drag to reschedule.
- **Workload**: assignee rows × capacity, overload highlighted danger.
- **Task Detail Drawer** (right slide-over, 480–640px; expandable to full page): title (inline edit) · status stepper Draft→Assigned→In-Progress→Review→Approved→Completed · meta grid (owner, assignee, priority, dates, est/actual, dept, project) · description (rich) · Subtasks · Checklist · Dependencies graph · Watchers · Attachments (dropzone) · Comments (@mentions, realtime) · Activity history. Approval badge when gated.
- **Create Modal**: required-field enforcement (owner/assignee/priority/due/status/dept/project) with inline validation; template picker; "create & add another".

Best-in-class touches: keyboard create from anywhere, optimistic drag, presence avatars, undo toast on destructive actions.

---

## 10. Project Management UX

Project workspace tabs: **Overview** (health score, status, dates, owner, team, budget burn) · **Timeline/Gantt** · **Kanban** · **Milestones** · **Risks** (register with severity) · **Budget** (planned vs actual) · **Files** · **Team** (workload) · **Analytics** (velocity, burndown, cycle time). Header shows methodology badge (Kanban/Scrum/Waterfall), progress ring, RAG health.

---

## 11. Meeting Management UX

- **Calendar**: month/week/day; meeting chips colored by type (company/dept/strategic/team/emergency).
- **Meeting Detail**: header (title, type, organizer, time, join) · Agenda · Minutes · Action Items · Attendance · Attachments/recording.
- **Agenda Builder**: drag-orderable items with time-boxes + owners.
- **MOM**: rich minutes; "Generate with AI ✦" → editable draft → approve; decisions list.
- **Action Items**: each row → "Convert to task" (creates linked task); assignee + due.
- **Attendance**: grid required/optional + attended toggles.
- **Meeting Analytics**: attendance %, action-item completion, on-time start, meetings-per-week.
- **Executive Meeting Room**: focused live mode for company meetings — agenda left, live collaborative notes center, participants + action-item capture right; one-screen "conduct" experience.

---

## 12. Other Modules (key specs)

- **Approval Center**: Inbox (Awaiting me / My requests) · Approval Details (payload + context) · **Workflow Visualization** (horizontal step chain showing current position, approver, status) · History Timeline. One-click Approve/Reject + comment; bulk approve.
- **Documents / Knowledge Base**: KB home (categories: SOP/Policy/Manual + search) · Wiki tree nav · Document Editor (block/rich, slash-commands) · Viewer (TOC, breadcrumbs) · **Version History** (diff, restore).
- **Reports**: builder + scheduled reports; export PDF/Excel/CSV; chart gallery.
- **Automation**: rule list + no-code builder (Trigger → Condition → Actions canvas) + run history + dry-run.
- **AI Assistant**: right drawer chat (context-aware to current screen) + AI Insights cards (risks, delays, workload) + Recommendations + Meeting Summaries + Project Analysis + Risk Alerts. Streaming responses; every write is a draft to approve.
- **Command Center (Owner Control Room)**: full-bleed dark "ops" view — real-time company metrics tiles, live activity stream, department status map, drill-down navigation, and emergency actions (broadcast, escalate, freeze). Auto-refresh via WebSocket; designed for a wall display.

---

## 13. Animation System

| Pattern | Spec |
|---|---|
| Page transition | fade+slide 8px, `base` |
| Drawer/slide-over | translateX, `slow`, backdrop fade |
| Modal | scale .98→1 + fade, `base`, e3 + backdrop blur |
| Menu/popover | scale .96→1 + fade, `fast`, origin-aware |
| Kanban drag | lift (scale 1.02 + e2), drop spring settle |
| Toast | slide-in bottom-right, auto-dismiss 4s, hover-pause |
| Skeleton | shimmer gradient sweep 1.2s loop |
| KPI count-up | number tween on first paint, `slow` |
| Hover elevation | overlay + glow, `fast` |
| Realtime update | brief accent flash on changed row/cell |

All respect `prefers-reduced-motion` (swap to instant/opacity-only).

---

## 14. States: Empty / Loading / Error

- **Empty**: centered illustration (line-art, accent tint), one-line headline, supporting text, primary CTA, optional secondary "Learn more". Per-module copy (e.g. "No tasks yet — create your first task").
- **Loading**: skeletons that match final layout (never spinners for content); shimmer; KPIs show placeholder bars; tables show 6 skeleton rows; preserve layout to avoid shift.
- **Error**: inline error card (danger-soft bg, icon, message, retry) for partial; full-page error (illustration + code + retry + contact) for fatal; toast for transient action failures with undo where applicable; 403 shows "You don't have access" with request-access CTA.

---

## 15. Component Library (ShadCN mapping)

| Sarion component | ShadCN base | Notes |
|---|---|---|
| Button (primary/secondary/ghost/danger) | `button` | + `accent`/`glow` variants |
| Input/Textarea/Select | `input`,`textarea`,`select` | dark, 6px radius |
| Combobox / CommandPalette | `command`,`dialog` | ⌘K |
| DataTable | `table` + TanStack Table | virtualized, inline edit |
| Drawer / Slide-over | `sheet` | task/notification |
| Modal | `dialog` | create flows |
| Dropdown / Context menu | `dropdown-menu`,`context-menu` | quick actions |
| Tabs / Segmented | `tabs`,`toggle-group` | view switchers |
| Badge / Chip | `badge` | status/priority/semantic-soft |
| Avatar / AvatarStack | `avatar` | presence ring |
| Tooltip / Popover / HoverCard | `tooltip`,`popover`,`hover-card` | |
| Toast | `sonner` | undo actions |
| Progress / Gauge | `progress` + custom radial | health scores |
| Calendar | `calendar` | meeting/due |
| Switch / Checkbox / Radio | `switch`,`checkbox`,`radio-group` | |
| Skeleton | `skeleton` | shimmer |
| Accordion / Collapsible | `accordion` | KB, filters |

Custom (not in ShadCN): KanbanBoard, GanttChart, WorkloadHeatmap, StatusStepper, ApprovalChainViz, OKRTree, MetricTile, ActivityTimeline, AIAssistantDrawer, MentionInput, FileDropzone, CommandCenterGrid.

---

## 16. Notification Center

Right slide-over, inbox-style. Top: tabs **All · Mentions · Approvals · Meetings · Tasks** + "Mark all read" + filter (unread only). Items: icon by type, title (bold actor), preview, relative time, unread dot; click → deep-link to resource; hover → quick actions (approve, mark read, mute). Grouped by Today/Earlier. Empty + skeleton states. Realtime via `notification.new`. Settings link → per-channel preferences (in-app/email/WhatsApp/push) + digest.

---

## 17. Responsive Rules

| Breakpoint | Width | Behavior |
|---|---|---|
| `xs` | <640 | Mobile: sidebar → bottom tab bar (Dashboard/Tasks/Meetings/AI/More) + hamburger drawer; tables → card lists; drawers → full-screen sheets; single column; FAB for quick-create |
| `sm/md` | 640–1024 | Tablet: sidebar collapses to icon-rail (toggle); 2-col dashboards; boards horizontal-scroll; drawers 90% width |
| `lg` | 1024–1440 | Desktop: full sidebar; 2–3 col grids |
| `xl/2xl` | >1440 | Wide: max-width content, more KPI columns, Command Center full-bleed |

Principles: desktop-first design, mobile = focused subset (my work, notifications, approvals, AI). Touch targets ≥44px on mobile. Boards remain horizontally scrollable, never crushed. Detail drawers become full-screen on mobile.

---

## 18. Accessibility Guidelines (WCAG 2.2 AA)

- Contrast: text ≥4.5:1, large/UI ≥3:1 (palette verified). Never color-only meaning — pair status color with label/icon.
- Keyboard: every action reachable; visible `focus-visible` ring (2px accent + 2px offset); logical tab order; no traps; Esc closes overlays.
- ARIA: roles for menus/dialogs/tabs/trees; live regions for toasts & realtime updates; labelled inputs; `aria-current` on active nav.
- Motion: honor `prefers-reduced-motion`. Targets ≥24px (44px touch). Screen-reader-only labels for icon buttons. Respect zoom to 200%.

---

## 19. Design Tokens (handoff formats)

**CSS variables** — implemented in `apps/web/app/globals.css` (`:root`).
**Tailwind theme** — implemented in `apps/web/tailwind.config.ts` (colors, radius, shadow, fontSize, spacing).
**Figma**: token JSON (W3C design-tokens format) mirrors the same names → `color/*`, `text/*`, `space/*`, `radius/*`, `shadow/*`, `motion/*`. Single source: keep CSS vars and Figma tokens in sync via the table in §2–4.

```
color.bg=#081120  color.surface=#0F172A  color.surface2=#162033  color.card=#1A2438
color.border=#27344F  text.primary=#F8FAFC  text.secondary=#94A3B8  text.muted=#64748B
accent=#3B82F6  success=#10B981  warning=#F59E0B  danger=#EF4444  info=#06B6D4
radius.sm=6 md=10 lg=14 xl=20   space.base=4   motion.base=180ms
```

---

## 20. Figma Structure

```
Sarion OS (Figma)
├─ 00 Cover
├─ 01 Foundations      (color, type, spacing, radius, elevation, icons, tokens page)
├─ 02 Components        (variants: buttons, inputs, badges, cards, table, drawer, modal,
│                        nav, KPI tile, kanban card, chips, avatars, charts)
├─ 03 Patterns          (empty/loading/error, forms, filters, bulk-action bar, command palette)
├─ 04 App Shell         (sidebar states, topbar, responsive frames)
├─ 05 Dashboards        (Owner, MD, Department, Employee)
├─ 06 Tasks             (list/kanban/calendar/timeline/workload, drawer, create)
├─ 07 Projects          (overview + tabs)
├─ 08 Meetings          (calendar, detail, agenda, MOM, exec room)
├─ 09 Approvals · 10 Docs/KB · 11 Reports · 12 Automation
├─ 13 AI Assistant · 14 Command Center
├─ 15 Mobile            (key flows: my tasks, notifications, approvals, AI)
└─ 99 Prototype         (flows + interactions)
```
Use Figma Variables for tokens (mode: Dark Navy now; Light reserved for v2), component properties for variants, auto-layout everywhere, and a 4px layout grid.

---

## 21. Complete UI Architecture (frontend)

- **Stack**: Next.js 15 App Router (RSC) · Tailwind (tokens) · ShadCN · TanStack Query (server state) · Zustand (UI state: sidebar, command palette, drawers) · socket.io (realtime) · react-hook-form + zod · Framer Motion (animation, reduced-motion aware).
- **Composition**: `AppShell` (Sidebar + Topbar + content slot) wraps all authed routes via route-group layout. Each module = `features/<module>` (components, hooks, queries, store). Shared primitives in `components/ui` (ShadCN) + `components/patterns`.
- **Theming**: CSS variables drive Tailwind; single dark theme now, light-mode-ready via variable swap.
- **Perf**: virtualization (tables/boards), code-split per route, optimistic mutations, suspense + skeletons, image/icon sprite optimization.
- **Realtime**: WS provider at shell; rooms per resource; row/cell flash on update; presence avatars.
- **A11y/perf budgets**: LCP <1.5s dashboards, interaction <100ms, AA enforced in CI (axe).
```
```
