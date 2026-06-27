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
  domain/<entity>/       — one package per entity; contains db.go, service.go, rpc.go
  pg/                    — shared Querier interface + Postgres error helpers
  lib/                   — shared utilities (RSA cookie, JWT verify)
  logger/                — slog setup
  middleware/            — HTTP middleware
  models/models.go       — shared domain types (User, Campaign, Session, …)
  bot/                   — Beny Bot (Discord slash commands)
    commands/            — one file per command group
gen/proto/planner/v1/    — buf-generated Go stubs
```

## Layering Rules (strict)

```
rpc → service → db
```

All three layers live together in `internal/domain/<entity>/`:

- **`db.go`**: SQL only. Implements the domain's `Store` interface. No business logic. All methods take `context.Context` as first arg and use `QueryRowContext`/`QueryContext`/`ExecContext`. Uses `pg.Querier` (not a local `querier` interface).
- **`service.go`**: Business logic. Defines domain errors (`ErrNotFound`, `ErrAlreadyExists`, …) and the `Store` interface. Orchestrates DB + external calls (Discord, Clerk). Uses `errgroup` for parallelism. Never writes SQL directly.
- **`rpc.go`**: Translates ConnectRPC request/response ↔ service calls. Maps service errors → ConnectRPC codes. No business logic.
- **`main.go`**: Wires everything. All new services MUST be registered here.

## Adding a New Service (checklist)

1. Add proto in `packages/proto/planner/v1/<entity>.proto`
2. Run `buf generate` from `packages/proto/`
3. Create `internal/domain/<entity>/db.go` — SQL queries implementing the `Store` interface
4. Create `internal/domain/<entity>/service.go` — domain errors, `Store` interface, business logic
5. Create `internal/domain/<entity>/rpc.go` — ConnectRPC handler
6. **Register in `cmd/api/main.go`** — easy to miss
7. Update web app: add ConnectRPC client in `apps/web/src/lib/api/transport.ts`

## DB Method Conventions

All domain `DB` methods must:
- Accept `context.Context` as the first parameter
- Use `QueryRowContext`, `QueryContext`, `ExecContext` — never the non-context variants
- Use `pg.Querier` as the connection type (satisfied by `*sql.DB` and `*sql.Tx`)

```go
// db.go
type DB struct {
    conn pg.Querier
    raw  *sql.DB
}

func NewDB(raw *sql.DB) *DB { return &DB{conn: raw, raw: raw} }

func (db *DB) GetThing(ctx context.Context, id string) (*model.Thing, error) {
    row := db.conn.QueryRowContext(ctx, `SELECT ...`, id)
    return scanThing(row)
}
```

## Error Pattern (per-domain)

Domain errors are defined in `service.go`, not a shared file:

```go
// domain/npc/service.go
var (
    ErrNotFound     = errors.New("npc not found")
    ErrAlreadyExists = errors.New("npc already exists")
)

// In service methods:
if errors.Is(err, sql.ErrNoRows) {
    return nil, ErrNotFound
}

// In rpc.go:
case errors.Is(err, npc.ErrNotFound):
    return nil, connect.NewError(connect.CodeNotFound, err)
```

## Postgres Error Helpers

Use `pg` package helpers — do not inspect `pgconn.PgError` directly:

```go
pg.IsError(err, pg.UniqueViolation)   // "23505"
pg.IsError(err, pg.ForeignKeyViolation) // "23503"
pg.Constraint(err)                    // returns constraint name string
```

## Auth

- `authorizeCampaignRole(db, campaignID, userID, required)` — verifies membership + role
- Clerk JWT verified in middleware using JWKS endpoint
- `GetAuth` RPC on `UserService` returns User + optional Campaign + optional MemberRole (called by web app on every request)

## Bot Dependencies (`BotDeps`)

`internal/bot/commands.BotDeps` holds explicit domain service references — no raw `*db.DB`:

```go
type BotDeps struct {
    Client                 *api.Client
    NpcSvc                 *domain_npc.Service
    CampaignIntegrationSvc *domain_campaignIntegration.Service
    SessionSvc             *domain_session.Service
    SeriesSvc              *domain_series.Service
}
```

Bot commands access DB via the domain service's `.DB` field (e.g. `deps.NpcSvc.DB.GetNpcByNameAndCampaign(ctx, ...)`), or call service methods directly.

Services shared between the bot and the RPC layer are created once in `main.go` and passed to both `startBenyBot` and `buildServices`.

## Known Issues (Do Not Replicate)

| Location | Issue |
|---|---|
| `internal/bot/commands/npc.go` | `npcSetModalOnSubmit` posts to `/api/discord/setAvailability` — wrong endpoint, should post to NPC update |
| `internal/domain/discord/service.go` | UserAvailability handled via web app Drizzle queries, not a proper Go service |

## Services Currently Registered

| Service | File |
|---|---|
| CampaignService | domain/campaign/rpc.go |
| CampaignIntegrationService | domain/campaign_integration/rpc.go |
| LocationService | domain/location/rpc.go |
| MemberService | domain/member/rpc.go |
| NonPlayerCharacterService | domain/npc/rpc.go |
| QuestService | domain/quest/rpc.go |
| SessionService | domain/session/rpc.go |
| UserService | domain/user/rpc.go |

## Services With No Go Implementation

| Entity | Status |
|---|---|
| Character | DB table exists (`player_character`); no service, no proto service |
| UserAvailability | DB table exists; web app queries directly via Drizzle |
| UserIntegration | DB table exists; no service anywhere |
| Discord (bot) | `discord.proto` documents target contract; NOT a ConnectRPC service |

## Hard Rules

- No SQL outside domain `db.go` files
- No business logic in `rpc.go` — only translation
- No service logic in `db.go` — only queries
- All DB methods take `context.Context` as first arg; use `*Context` query methods
- Use `pg.Querier` — never define a local `querier` interface in a domain package
- Use `log/slog` — no `fmt.Println`, no `log.Print`
- Use `authorizeCampaignRole` for all role-gated operations
- All new services wired in `main.go`

## Build & Verify

```bash
cd apps/api && go build ./...
cd apps/api && go vet ./...
```
