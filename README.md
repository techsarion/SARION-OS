# Sarion OS

Single production-ready **Next.js 15 + Supabase** application. (Converted from the former NestJS monorepo — no more API app, packages, Turbo, pnpm workspaces, or Docker.)

Stack: Next.js 15 · TypeScript · App Router · Supabase (Auth / Postgres / Storage / Realtime) · Tailwind · ShadCN · React Hook Form · Zod · Recharts. Frontend + backend in one app via **Server Actions**. RLS + middleware for protection.

## Structure
```
sarion-os/
├─ app/                  routes (App Router): /, /login, /error
│  ├─ globals.css        design tokens (Dark Navy Enterprise)
│  └─ layout.tsx page.tsx login/ error/
├─ components/           UI components (nav model, ShadCN to grow here)
├─ lib/
│  ├─ supabase/          client.ts (browser) · server.ts (RSC/actions) · middleware.ts (session)
│  ├─ actions/           Server Actions (auth.ts)
│  ├─ auth.ts            getCurrentUser / requireUser / requirePermission
│  ├─ rbac.ts            permission catalog + role map + can()
│  └─ utils.ts           cn()
├─ hooks/                use-realtime.ts (Supabase Realtime)
├─ types/                enums.ts · database.types.ts (generated) · index.ts
├─ supabase/
│  ├─ config.toml
│  └─ migrations/        0001_init.sql · 0002_rls.sql (RLS + storage bucket)
├─ public/
├─ middleware.ts         route protection (redirects unauthenticated → /login)
├─ next.config.mjs  tailwind.config.ts  tsconfig.json  postcss.config.mjs
├─ vercel.json
└─ .env.local            (copy from .env.local.example)
```

## Setup
```bash
cp .env.local.example .env.local      # fill Supabase URL + anon + service-role keys
npm install
# Database (local Supabase):
npx supabase start                    # or use a cloud project
npx supabase db push                  # applies migrations 0001 + 0002 (schema + RLS)
npm run db:types                      # regenerate types/database.types.ts
npm run dev                           # http://localhost:3000
```

## Architecture
- **Auth**: Supabase Auth (email/password) via Server Actions (`lib/actions/auth.ts`). Session cookies refreshed in `middleware.ts` → `lib/supabase/middleware.ts`.
- **Route protection**: middleware redirects unauthenticated users to `/login`; `requireUser()`/`requirePermission()` guard Server Components/Actions.
- **RBAC**: `lib/rbac.ts` (app layer) + SQL `auth_role()/is_admin()/is_manager()` functions enforcing the same scope in **RLS** (`0002_rls.sql`) — defense in depth.
- **Data**: Supabase Postgres; `profiles` extends `auth.users` with role/department. All tables have RLS enabled.
- **Storage**: `attachments` bucket with authenticated policies.
- **Realtime**: `hooks/use-realtime.ts` subscribes to Postgres changes.

## Migration checklist (monorepo → single app) — DONE
- [x] Moved `apps/web/app` → `app/`, `apps/web/components` → `components/`
- [x] Inlined `@sarion/contracts` → `types/enums.ts`, `@sarion/rbac` → `lib/rbac.ts`
- [x] Translated Prisma schema → `supabase/migrations/0001_init.sql`
- [x] Added RLS + helper functions + storage → `0002_rls.sql`
- [x] Deleted `apps/`, `packages/`, `docker/`, `turbo.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `tsconfig.base.json`, all `node_modules`
- [x] New single-app `package.json` (no NestJS / Turbo / workspace deps)
- [x] Supabase clients (browser/server/middleware), auth helpers, Server Actions
- [x] `middleware.ts` route protection; `/login` + `/error` pages
- [x] `vercel.json` + `.env.local.example` for deployment
- [x] `npm run build` + `tsc --noEmit` pass

## Deploy (Vercel)
1. Push to Git; import repo in Vercel (framework auto-detected: Next.js).
2. Set env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
3. Apply migrations to your cloud Supabase project (`supabase db push` against the linked project).
4. Deploy. Middleware + Server Actions run on Vercel's Node/Edge runtime automatically.

> Design + product docs preserved in [`docs/`](docs/).
