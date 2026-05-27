# packages/database — CLAUDE.md

Drizzle ORM schema for Neon Postgres. Used **only** by the web app (`apps/web`). The Go API uses raw SQL in `apps/api/internal/db/db.go`. See root CLAUDE.md for monorepo conventions.

## Stack

- **ORM**: Drizzle ORM (`drizzle-orm`)
- **DB**: Neon Postgres (serverless)
- **Enums**: all use `enumToPgEnum()` helper — never use raw string arrays
- **Types**: `packages/schemas` for complex jsonb columns; `packages/enums` for enum values

## Schema Files

| File | Table | Notes |
|---|---|---|
| `users.ts` | `users` | Soft delete; partial unique index on email where deletedAt IS NULL |
| `campaigns.ts` | `campaigns` | FK to users; cascade |
| `campaignUsers.ts` | `campaign_users` | Composite PK (userId, campaignId); userRoleEnum |
| `campaignIntegrations.ts` | `campaign_integrations` | jsonb `metaData` + `settings` typed via `IntegrationMetadata`/`IntegrationSettings` from schemas |
| `campaignInvitations.ts` | `campaign_invitations` | statusEnum default PENDING; partial unique index (one pending per email per campaign) |
| `sessions.ts` | `sessions` | sessionStatusEnum; **`players: many(charactersTable)` relation exists but is never used** |
| `characters.ts` | `player_character` | **Singular table name** — do not rename without migration; jsonb `character_sheet`; no Go service |
| `nonPlayerCharacters.ts` | `non_player_characters` | foundryActorId + lastFoundrySyncAt; FK to locations/sessions |
| `quests.ts` | `quests` | — |
| `locations.ts` | `locations` | — |
| `userAvailabilities.ts` | `user_availabilities` | `interval` supports biweekly (1 or 2); effectiveFrom/effectiveUntil; no Go service |
| `userIntegrations.ts` | `user_integrations` | FK to users + campaignUsers composite; unique on (campaignId, source, userId); **no service layer anywhere** |

## Conventions

### Enum Pattern (always use this)
```typescript
import { enumToPgEnum } from "@planner/database/utils";
import { UserRole } from "@planner/enums/user";

export const userRoleEnum = pgEnum("user_role", enumToPgEnum(UserRole));
```

Never: `pgEnum("user_role", ["DUNGEON_MASTER", "PLAYER"])` — enums drift.

### Relations
Define `relations()` alongside every table. Keep them even if currently unused — they document intent.

### jsonb Columns
Type them via schemas from `packages/schemas`:
```typescript
metaData: jsonb("meta_data").$type<IntegrationMetadata>()
```

### Migrations
Drizzle migrations via `drizzle-kit`. Run `bun run db:generate` to create a new migration after schema changes. Commit migration files — never edit existing ones.

## Table Status

| Table | Go API | Web oRPC Router | Notes |
|---|---|---|---|
| `campaigns` | ✅ CampaignService | ✅ campaign.ts | Full stack |
| `campaign_users` | ✅ MemberService | ✅ member.ts | Full stack |
| `campaign_integrations` | ✅ CampaignIntegrationService | ✅ integration.ts | Full stack |
| `campaign_invitations` | ✅ MemberService | ✅ member.ts | Full stack |
| `sessions` | ✅ SessionService | ✅ session.ts | Full stack |
| `locations` | ✅ LocationService | ✅ location.ts | Full stack |
| `non_player_characters` | ✅ NpcService | ✅ npc.ts | Full stack |
| `quests` | ✅ QuestService | ✅ quest.ts | Full stack |
| `users` | ✅ UserService | — | Auth-managed |
| `player_character` | ❌ No service | ⚠️ character.ts (Drizzle violation) | Needs Go service |
| `user_availabilities` | ❌ No service | ⚠️ discord.ts (Drizzle violation) | Needs Go service |
| `user_integrations` | ❌ No service | ❌ No router | Fully orphaned |

## Known Issues

- `player_character` table name is **singular** — all others are plural. This is intentional; do not rename without a migration.
- `sessions.players` relation (`many(charactersTable)`) is defined but never used by any query — the sessions → characters join path is not implemented.
- `user_integrations` table has no service, no proto, and no migration path documented. Handle as part of the UserIntegration feature.
- Web app character and availability queries go directly through Drizzle instead of the Go API. These are known violations — do not pattern-match against `character.ts` or `discord.ts`.

## Hard Rules

- Drizzle is web-app only. Never import `packages/database` from `apps/api`.
- Do not query Drizzle in oRPC routers for entities that have a Go API service. Use `context.api.*`.
- Always use `enumToPgEnum()` — never hardcode enum string arrays.
- Always define `relations()` for every table.
- Commit generated migration files. Never hand-edit them.
