# apps/api — CLAUDE.md

Go API server using ConnectRPC (protobuf), `log/slog`, `database/sql` + `pgx/v5`. See root CLAUDE.md for monorepo conventions.

## Stack

- **Framework**: ConnectRPC (`connectrpc.com/connect`) — protobuf-first RPC
- **Language**: Go 1.23+
- **DB driver**: `pgx/v5` via `database/sql` — raw SQL only
- **Auth**: Clerk JWT via JWKS endpoint; RSA-encrypted cookie helpers in `lib/`
- **Discord bot**: `discordgo` — co-located in same process, see `internal/bot/`
- **Logging**: `log/slog` structured logging
- **Config**: env-loaded via `internal/config/`
- **Proto-generated stubs**: `gen/proto/planner/v1/` — do not edit

## Directory Layout

```
cmd/api/main.go          — wiring: DB, services, RPC handlers, bot
internal/
  config/                — env config struct
  db/db.go               — ALL SQL lives here; no SQL outside this file
  lib/                   — shared utilities (RSA cookie, JWT verify)
  logger/                — slog setup
  middleware/            — HTTP middleware
  models/models.go       — shared domain types (User, Campaign, Session, …)
  rpc/                   — ConnectRPC handler layer (maps RPCs → service calls)
  service/               — business logic layer
    errors.go            — pgError helpers + domain error types
    auth.go              — authorizeCampaignRole helper
  bot/                   — Beny Bot (Discord slash commands)
    commands/            — one file per command group
gen/proto/planner/v1/    — buf-generated Go stubs
```

## Layering Rules (strict)

```
rpc → service → db
```

- **db/db.go**: SQL only. No business logic. Takes `*sql.DB` + domain types. All queries live here.
- **service/**: Maps domain errors. Orchestrates DB calls + external calls (Discord, Clerk). Uses `errgroup` for parallelism. Never writes SQL directly.
- **rpc/**: Translates ConnectRPC request/response ↔ service calls. Maps service errors via `mapServiceError()` → ConnectRPC codes. No business logic.
- **main.go**: Wires everything. All new services MUST be registered here.

## Adding a New Service (checklist)

1. Add proto in `packages/proto/planner/v1/<entity>.proto`
2. Run `buf generate` from `packages/proto/`
3. Add SQL methods to `internal/db/db.go`
4. Add domain errors to `internal/service/errors.go` if needed
5. Implement service in `internal/service/<entity>.go`
6. Implement RPC handler in `internal/rpc/<entity>.go`
7. **Register in `cmd/api/main.go`** — easy to miss
8. Update web app: add ConnectRPC client in `apps/web/src/lib/api/transport.ts`

## Error Mapping Pattern

```go
// service/errors.go
var ErrSessionNotFound = errors.New("session not found")

// In service layer:
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrSessionNotFound
}

// In rpc layer:
func mapServiceError(err error) error {
    switch {
    case errors.Is(err, service.ErrSessionNotFound):
        return connect.NewError(connect.CodeNotFound, err)
    // ...
    }
}
```

## Postgres Error Helpers

```go
// service/errors.go — use these, do not inspect pgconn.PgError directly
isPgError(err, "23505")      // unique violation
pgConstraint(err)             // returns constraint name string
```

## Auth

- `authorizeCampaignRole(db, campaignID, userID, required)` — verifies membership + role
- Clerk JWT verified in middleware using JWKS endpoint
- `GetAuth` RPC on `UserService` returns User + optional Campaign + optional MemberRole (called by web app on every request)

## Known Issues (Do Not Replicate)

| Location | Issue |
|---|---|
| `internal/bot/commands/npc.go` | `npcSetModalOnSubmit` posts to `/api/discord/setAvailability` — wrong endpoint, should post to NPC update |
| `rpc/health.go` | `HealthService` defined but **NOT registered in main.go** |
| `service/discord.go` | UserAvailability handled via web app Drizzle queries, not a proper Go service |

## Services Currently Registered

| Service | File |
|---|---|
| CampaignService | rpc/campaign.go |
| CampaignIntegrationService | rpc/campaignIntegration.go |
| LocationService | rpc/location.go |
| MemberService | rpc/member.go |
| NonPlayerCharacterService | rpc/npc.go |
| QuestService | rpc/quest.go |
| SessionService | rpc/session.go |
| UserService | rpc/user.go |
| **HealthService** | rpc/health.go — **NOT registered** |

## Services With No Go Implementation

| Entity | Status |
|---|---|
| Character | DB table exists (`player_character`); no service, no proto service |
| UserAvailability | DB table exists; web app queries directly via Drizzle |
| UserIntegration | DB table exists; no service anywhere |
| Discord (bot) | `discord.proto` documents target contract; NOT a ConnectRPC service |

## Hard Rules

- No SQL outside `internal/db/db.go`
- No business logic in `rpc/` layer — only translation
- No service logic in `db/` layer — only queries
- Use `log/slog` — no `fmt.Println`, no `log.Print`
- Use `authorizeCampaignRole` for all role-gated operations
- All new services wired in `main.go`

## Build & Verify

```bash
cd apps/api && go build ./...
cd apps/api && go vet ./...
```
