# party-planner — Root CLAUDE.md

## Repository Overview

Nx monorepo. Bun as runtime and package manager throughout.

```
apps/
  web/          TanStack Start (SSR) + TanStack Router + oRPC
  api/          Go ConnectRPC API + Beny Bot (Discord)
packages/
  database/     Drizzle ORM schemas (Neon Postgres) — web-only
  proto/        Protobuf definitions (buf)
  schemas/      Zod v4 validation schemas
  enums/        Shared TypeScript enums
  security/     Auth helpers (RSA cookie encryption)
```

## Request Flow

```
Browser → TanStack Router → oRPC handler (apps/web)
  → auth/dbMiddleware → ConnectRPC client (transport.ts)
    → Go API (apps/api) → db.go SQL → Neon Postgres
```

Discord bot flow:
```
Discord → Beny Bot (in-process with Go API)
  → api.Client → POST /api/* on web app (internal API key)
    → discord.ts oRPC router → Drizzle (web) OR Go API
```

## Active Campaign Model

- `active_campaign_id` cookie set in `authMiddleware` after `GetAuth` RPC
- Encrypted auth cookie (`planner_auth`) holds `{user, campaign, role}` — RSA-encrypted
- `privateProcedure` context always has `campaignId` and `role`
- Cookie cleared on stale/deleted campaign detection

## Toolchain

```bash
bun install          # install deps
bun run build        # build all
bun run lint         # Biome linter
bun run typecheck    # tsc --noEmit
```

Go API (from apps/api/):
```bash
go build ./...
go vet ./...
```

Protobuf codegen (from packages/proto/):
```bash
buf generate
```

## Time & Timezone

- All timestamps stored in the database are UTC
- `Timezone` fields on models are kept for frontend display conversion only — never used for storage or server-side calculations
- In Go: always call `.UTC()` before storing a `time.Time` or pass `time.UTC` when constructing one
- In TypeScript/Drizzle: store `Date` values as UTC; convert to local time only at the UI layer

## Universal Conventions

- TypeScript: no `any` (use `unknown` + type guards), no `console.*`, no raw `process.env`, no nested ternaries (use `if/else` or early returns instead)
- Zod v4 via `catalog:` for all TS validation
- oRPC for web server procedures, ConnectRPC for web→Go
- Drizzle is **web-only**; Go API uses raw SQL via `database/sql` + `pgx/v5`
- All enums in `packages/enums/src/` — import from there, never redefine
- All Zod schemas in `packages/schemas/src/` — export request/response pairs
- Named exports everywhere, no default exports
- Conventional commits: `feat:`, `fix:`, `chore:`, `refactor:`, `docs:`, `test:`

## Known Architectural Violations (do not replicate)

1. `apps/web/src/server/routers/character.ts` — queries Drizzle directly, bypassing Go API
2. `apps/web/src/server/routers/discord.ts` — queries Drizzle directly; has TODO to rework
3. `apps/web/src/routes/api.webhooks.clerk.ts` — uses `console.error` (biome lint exemptions)

These are explicitly tracked as P0 items for 2.0 remediation. Do not add new direct Drizzle queries in oRPC routers unless the data has no Go API path.

## Adding a New Entity

1. Add Drizzle schema in `packages/database/src/schema/`
2. Add proto service + messages in `packages/proto/planner/v1/`
3. Run `buf generate` to regenerate TypeScript + Go stubs
4. Add Go model in `apps/api/internal/models/models.go`
5. Add DB methods in `apps/api/internal/db/db.go`
6. Add service in `apps/api/internal/service/`
7. Add RPC handler in `apps/api/internal/rpc/`
8. Register handler in `apps/api/cmd/api/main.go`
9. Add Zod schemas in `packages/schemas/src/`
10. Add oRPC router in `apps/web/src/server/routers/`
11. Register router in `apps/web/src/server/index.ts`
12. Add ConnectRPC client in `apps/web/src/lib/api/transport.ts`
13. Add UI routes under `apps/web/src/routes/_authenticated/`

## Database Tables

| Table | Status |
|---|---|
| `users` | ✅ Full stack |
| `campaigns` | ✅ Full stack |
| `campaign_users` | ✅ Full stack |
| `campaign_integrations` | ✅ Full stack |
| `campaign_invitations` | ✅ Full stack |
| `session` | ✅ Full stack |
| `non_player_character` | ✅ Full stack |
| `quest` | ✅ Full stack |
| `location` | ✅ Full stack |
| `player_character` | ⚠️ DB + Drizzle only, no Go API |
| `user_availabilities` | ⚠️ DB + Drizzle only, no Go API |
| `user_integrations` | ❌ DB only, no service layer |

## Critical Enum Inconsistency

`RelationToParty` has a mismatch between layers:
- Go model: `"ENEMY"`
- TypeScript enum: `"HOSTILE"` (in `packages/enums/src/character.ts`)
- Proto: `RELATION_TO_PARTY_ENEMY = 3`

Data written through Go API stores `"ENEMY"`; data written via Drizzle stores `"HOSTILE"`. Resolve before adding any character-facing features.

## No Tests

Zero test files exist anywhere. The 2.0 plan includes adding a test layer as a P0 foundation item.
