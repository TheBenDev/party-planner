# party-planner — AGENTS.md

Agent guidance for the party-planner monorepo. Read CLAUDE.md first for conventions and architecture.

## Agent Routing

| Task | Agent |
|---|---|
| New entity end-to-end | `executor` (opus) — follow the 13-step checklist in CLAUDE.md |
| Go API changes | `executor` — see apps/api/CLAUDE.md |
| Web app changes | `executor` — see apps/web/CLAUDE.md |
| Proto schema changes | `executor` — run `buf generate` after; verify generated stubs |
| DB schema changes | `executor` — create migration; update Drizzle schema |
| Code review | `code-reviewer` |
| Architecture decisions | `architect` |
| Test strategy | `test-engineer` |
| Security review | `security-reviewer` |

## Key Gotchas by Layer

### Go API (apps/api)
- All SQL lives in `db/db.go`. Never write SQL in service or rpc layers.
- Service layer maps domain errors (e.g. `sql.ErrNoRows` → `ErrXxxNotFound`).
- RPC layer maps service errors via `mapServiceError()` → ConnectRPC codes.
- `pgError` helpers in `service/errors.go` — use these for Postgres error classification.
- `HealthService` is defined in `rpc/health.go` but **not registered in main.go**. Register it when adding health-check infrastructure.
- All new services need wiring in `cmd/api/main.go` — easy to miss.

### Web App (apps/web)
- Three procedure types: `publicProcedure`, `privateProcedure`, `discordProcedure`.
- `privateProcedure` injects: `userId`, `campaignId`, `role`, `api` (ConnectRPC clients), `db` (Drizzle).
- `discordProcedure` validates `Bot <api_key>` header — used only by Beny Bot callbacks.
- Auth cookie must be refreshed after campaign create/delete — see `updateAuthCookie` usage in campaign router.
- Never query Drizzle in oRPC routers for entities that have a Go API path. Use the ConnectRPC client (`context.api.*`).
- `discord.ts` and `character.ts` are known violations — do not pattern-match against them.
- ConnectRPC clients available via `context.api`: campaign, campaignIntegration, location, member, npc, quest, session, user.

### Database (packages/database)
- Drizzle is used only in the web app. Go API uses raw SQL.
- All enums use the `enumToPgEnum()` helper — never use raw string arrays.
- Always define relations alongside the table. The `players: many(charactersTable)` relation on `sessionsTable` is currently unused but intentional.
- `player_character` table name is singular; most others are plural. Don't rename without a migration.

### Protobuf (packages/proto)
- `buf generate` must be run after any `.proto` change before building either app.
- `DiscordService` proto exists but is NOT implemented as a ConnectRPC service in Go. It documents the intended contract for the discord.ts rework.
- The `discord.proto` availability RPCs are the target shape for the Go API UserAvailability service.

### Beny Bot (apps/api/internal/bot)
- Bot is co-located in the Go API process.
- Commands call back to the web app via `api.Client` (HTTP to `VITE_APP_URL`).
- **Known bug in `commands/npc.go`**: `npcSetModalOnSubmit` posts to `/api/discord/setAvailability` — wrong endpoint. Should post to an NPC update endpoint.
- All commands use `discordProcedure` on the web app side.

## Build & Verify Commands

```bash
# Web app type check
cd apps/web && bun run typecheck

# Go API build
cd apps/api && go build ./...

# Go vet
cd apps/api && go vet ./...

# Lint (from root)
bun run lint

# Proto codegen
cd packages/proto && buf generate
```

## No Tests Exist

As of 2.0 planning phase, there are zero test files. Any implementation work should include tests. Recommended stack:
- Go: `testing` + `testcontainers-go` (no mocks for DB)
- TypeScript: `bun test` + `@testing-library/react` for components
- E2E: Playwright

## Security Considerations

- Internal API key (`X-Internal-Api-Key`) gates all Go API access. Never expose this in client-side code.
- Auth cookie is RSA-encrypted — private key is server-only (`AUTH_PRIVATE_KEY_PEM`).
- Clerk JWT verification happens in `authMiddleware` before any `privateProcedure` runs.
- Discord bot callbacks authenticated via `discordMiddleware` (`Bot <key>` header check).
- All DB inputs go through Drizzle parameterised queries (web) or `database/sql` prepared statements (Go).
