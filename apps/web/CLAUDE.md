# apps/web — CLAUDE.md

TanStack Start (SSR) + TanStack Router + oRPC server. See root CLAUDE.md for monorepo conventions.

## Stack

- **Framework**: TanStack Start (SSR), TanStack Router (file-based)
- **Server procedures**: oRPC (`@orpc/server`, `@orpc/client`)
- **Go API client**: ConnectRPC (`@connectrpc/connect-web`)
- **DB**: Drizzle ORM (Neon Postgres) — used only in `packages/database`; never queried directly from oRPC routers
- **Auth**: Clerk (JWT verification) + RSA-encrypted auth cookie
- **UI**: shadcn/ui, Tailwind v4, React 19
- **Email**: Resend + React Email
- **Logging**: pino (via `context.logger`)
- **Validation**: Zod v4 (import from `catalog:`)

## Feature Folder Structure

Code is organized by feature, not by type. Each feature owns its components, hooks, procedures, and types:

```
src/features/<entity>/
  components/       — UI components scoped to this feature
  hooks/            — TanStack Query hooks (useQuery/useMutation) for this feature
  procedures/       — oRPC server-side procedure handlers
  procedures/proto/ — helpers that convert proto types to domain types
  routes/           — Page components rendered by TanStack Router
  types.ts          — Zod schemas + inferred TypeScript types
```

Truly shared code (auth hook, theme hook, shadcn/ui primitives, query keys, oRPC client) lives in `src/shared/`.

TanStack Router file-based routes under `src/routes/_authenticated/campaign/<entity>/` are thin — they import and render the page component from the matching feature folder.

## Key Files

| File | Purpose |
|---|---|
| `src/server/middleware.ts` | Procedure factories, middleware, cookie helpers |
| `src/server/router.ts` | Root router — registers all feature procedure routers |
| `src/shared/lib/api/transport.ts` | ConnectRPC client factory |
| `src/shared/lib/client.ts` | Browser-side oRPC client |
| `src/shared/lib/serverClient.ts` | SSR-side oRPC client |
| `src/env.ts` | Type-safe env (no raw `process.env` anywhere else) |
| `src/routes/api.$.ts` | oRPC handler mount + OpenAPI docs |
| `src/routes/api.webhooks.clerk.ts` | Clerk webhook handler |

## Procedure Types

```typescript
// Public — no auth required
publicProcedure.route({...}).input(schema).output(schema).handler(...)

// Private — requires Clerk JWT; injects userId, campaignId, role, api
privateProcedure.route({...}).input(schema).output(schema).handler(async ({ input, context }) => {
  const { userId, campaignId, role, api, logger } = context;
  // api.campaign, api.session, etc. — ConnectRPC clients
})

```

## ConnectRPC Clients (context.api)

Available in all `privateProcedure` handlers:
- `api.campaign` — CampaignService
- `api.campaignIntegration` — CampaignIntegrationService
- `api.location` — LocationService
- `api.member` — MemberService
- `api.npc` — NonPlayerCharacterService
- `api.quest` — QuestService
- `api.session` — SessionService
- `api.user` — UserService

## Auth Cookie Lifecycle

1. `authMiddleware` runs on every `privateProcedure` call
2. Verifies Clerk JWT → calls `GetAuth` RPC on Go API
3. Decrypts `planner_auth` cookie (RSA, `AUTH_PRIVATE_KEY_PEM`)
4. Updates cookie if campaign/role data changed
5. Clears `active_campaign_id` cookie if campaign is stale/deleted

After campaign create: call `updateAuthCookie(env.VITE_AUTH_PUBLIC_KEY_PEM, context, {...})`
After campaign delete: call `deleteCookie(context.reqHeaders, ACTIVE_CAMPAIGN_ID_COOKIE_NAME)`

## Adding a New Feature

1. Create `src/features/<entity>/` with subfolders: `components/`, `hooks/`, `procedures/`, `routes/`
2. Add `src/features/<entity>/types.ts` — Zod schemas + inferred types
3. Add `src/features/<entity>/procedures/<entity>.ts` — oRPC handlers using `privateProcedure`
4. Export a named `<entity>Router` object from the procedures file
5. Register in `src/server/router.ts`:

```typescript
// src/server/router.ts
import { entityRouter } from "@/features/<entity>/procedures/<entity>";
const appRouter = {
  ...,
  entity: entityRouter,
};
```

6. Add TanStack Router file under `src/routes/_authenticated/campaign/<entity>/` — import and render the page component from `src/features/<entity>/routes/`
7. Add TanStack Query hooks in `src/features/<entity>/hooks/` — one hook file per logical grouping (e.g. `useEntity.ts` for detail, `useEntityList.ts` for list + mutations)

## Route File Conventions

- TanStack Router files under `src/routes/_authenticated/campaign/<entity>/` are thin wrappers — they call `createFileRoute` and render the page component from `src/features/<entity>/routes/`
- Page components live in `src/features/<entity>/routes/`
- Data fetching and mutations belong in `src/features/<entity>/hooks/` — not inline in page components
- Role guard: check `role === UserRole.DUNGEON_MASTER` for DM-only actions
- Toast feedback: `toast.success()` / `toast.error()` from `sonner`

## Hard Rules

- No `console.*` — use `context.logger.info/warn/error`
- No raw `process.env` — use `env` from `src/env.ts`
- No `any` — use `unknown` + type guards
- No Drizzle queries for entities that have a Go API path
- No direct SQL
- Input validation via Zod on every procedure — never trust raw input

## Proto-Generated Types

Generated TS types live in `src/gen/proto/planner/v1/*_pb.ts`. Do not edit these — they are regenerated by `buf generate` from `packages/proto/`.

## Environment Variables

Defined and validated in `src/env.ts` using `@t3-oss/env-core`. Adding a new variable:
1. Add to `src/env.ts` server or client schema
2. Add to deployment env (Railway)
3. Never access `process.env` outside `src/env.ts`
