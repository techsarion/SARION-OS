# Sarion OS — UI Implementation Plan & Component Guidelines

> The build standard for **every** Sarion screen. Derived from the logo (`/public`): electric-blue → cyan on deep graphite. Dark-only · **2px radius globally** · Inter (400/500/600/700) · 4px spacing. No glassmorphism, no neon, no flashy gradients, no gaming/crypto styling. Pair: Linear precision + Stripe clarity + Vercel restraint + Notion density + Attio data-richness + Raycast keyboard-first.

## 1. What's implemented (foundation — done)

| Layer | File(s) |
|---|---|
| Design tokens (CSS vars) | `app/globals.css` |
| Tailwind theme (colors, 2px radius, type ramp, shadows, fonts) | `tailwind.config.ts` |
| Fonts (Inter + JetBrains Mono via `next/font`) | `app/layout.tsx` |
| UI primitives | `components/ui/{button,card,badge,input,misc}.tsx` |
| Brand | `components/brand/logo.tsx` |
| App shell (collapsible sidebar, topbar, insights panel) | `components/shell/{app-shell,sidebar,topbar,insights-panel}.tsx` |
| Authed route group | `app/(app)/layout.tsx` |
| Owner dashboard + charts | `app/(app)/page.tsx`, `components/dashboard/{kpi-card,charts}.tsx` |
| Premium two-panel login | `app/login/page.tsx` |

## 2. Layout contract

- **All authenticated pages** live under `app/(app)/<route>/page.tsx` → automatically wrapped by `AppShell` (sidebar + topbar + optional right insights panel).
- **Unauthenticated pages** (login, forgot-password, error) live at `app/<route>` — no shell.
- Sidebar: 252px expanded / 68px icon-rail collapsed; state persisted to `localStorage` (`sarion:sidebar-collapsed`). Topbar 56px sticky. Content max-width 1320px for dashboards; full-bleed for boards.
- Right Insights panel (`xl:` only, 300px) is opt-in per page via `AppShell showInsights`.

## 3. Component styling guidelines (apply to every new component)

- **Radius**: only `rounded-sm` (=2px) or `rounded-full` (avatars/dots). Never `rounded-md/lg/xl` with a real value.
- **Surfaces stack**: `bg-bg` (app) → `bg-surface`/`bg-surface-2` (panels/sidebar) → `bg-card` (cards) → `bg-card-2` (nested/hover). Depth comes from this stack + 1px `border-border`, **not** heavy shadows or blur.
- **Borders**: `border-border` hairlines; `border-border-strong` for inputs and emphasis. Dividers: `divide-border`.
- **One accent**: `accent` (blue) for primary/interactive, `accent-cyan` for AI/secondary brand moments. Semantic colors (`success/warning/danger/info`) carry meaning only — never decoration. Always pair color with a label or icon (a11y).
- **Type**: use the ramp tokens (`text-display/h1/h2/h3/body/body-sm/caption/overline`). Tabular numerals (`tnum` / `tabular-nums`) for all metrics, counts, IDs, money. Max 2 weights per view.
- **Spacing**: 4px scale (Tailwind native). Card padding 16px (`p-4`), section gap 20px (`space-y-5`), page gutter 20–28px.
- **States**: every list/table/widget ships Empty + Loading (`Skeleton` shimmer, never spinners) + Error variants. Destructive actions get an undo toast.
- **Motion**: `duration-fast/base/slow` + `ease-out`; entrance `fade-up`. Honor `prefers-reduced-motion`.
- **Interactive**: hover = surface lighten (`hover:bg-white/[0.04]`); active nav = `accent-soft` bg + 2px left accent bar. Focus = 2px accent ring (built into `:focus-visible`).
- **Keyboard-first**: every action reachable; `⌘K` palette is the primary nav; provide `title`/`aria-label` on icon-only controls.

## 4. Primitive API quick-reference

- `Button` — variants `primary | secondary | ghost | outline | danger | link`; sizes `sm | md | lg | icon | icon-sm`.
- `Card` + `CardHeader/Title/Description/Content/Footer`.
- `Badge` — tones `neutral | accent | success | warning | danger | info | outline`; `dot` prop.
- `Input` + `Label`; `Separator`, `Skeleton`, `Avatar`, `Kbd` (in `ui/misc`).
- Charts (`dashboard/charts`): `ProductivityChart`, `DepartmentChart`, `HealthGauge`, `Sparkline` — all Recharts, brand-colored, dark tooltips.

## 5. Build order for remaining UI (per module — follow docs/13 §8–16)

1. **ShadCN primitives to add** (CLI or handcraft, all 2px): `dialog`, `sheet` (drawers), `dropdown-menu`, `command` (⌘K palette), `tabs`/`toggle-group` (view switchers), `tooltip`, `popover`, `hover-card`, `calendar`, `table` (+ TanStack), `sonner` (toasts), `select`, `checkbox`/`switch`/`radio`, `accordion`.
2. **Shell completions**: real ⌘K command palette (`command`+`dialog`), Quick-actions menu (`dropdown`), Notification slide-over (`sheet`), User menu (`dropdown`).
3. **Dashboards**: MD / Department / Employee variants reusing `KpiCard`, charts, `Card` widgets (docs/13 §8).
4. **Tasks** (§9): DataTable (List) · KanbanBoard · Calendar/Timeline/Workload · TaskDrawer (`sheet`) · Create modal (`dialog`, required-field validation).
5. **Projects** (§10) · **Meetings** (§11) · **Approvals / Docs / Reports / Automation / AI / Command Center** (§12) — each as `app/(app)/<module>/` + `features/<module>/` (components, hooks, queries).
6. **Patterns**: empty/loading/error, bulk-action bar, filters, segmented view-switcher, ActivityTimeline, StatusStepper, ApprovalChainViz, OKRTree, AIAssistantDrawer.

## 6. Definition of done (every page)

Production-ready · enterprise-grade · keyboard-navigable · WCAG AA (contrast verified, focus rings, ARIA) · responsive (mobile = focused subset, tables → card lists, drawers → full-screen) · skeleton loading · empty/error states · realtime-ready · 2px radius throughout · single brand accent.
