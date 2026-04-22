# 🎲 Party Planner — D&D Campaign Manager

> The operational layer around your campaign. Schedule sessions, track narrative state, manage NPCs, and surface the right context at the right time.

Party Planner is a web application built for Dungeon Masters to manage the full lifecycle of a D&D campaign — not a replacement for Foundry VTT, but the planning and coordination layer around it. Discord is the primary communication channel for the party, and Beny Bot bridges the gap between your players and the app.

---

## Features

- **Session Scheduling** — Create sessions, poll Discord for availability, send automated reminders
- **Pre-Session DM Brief** — AI-generated summary of open plot threads, relevant NPCs, and last session recap
- **Post-Session Recaps** — Add notes after a session; AI helps write a narrative summary published to Discord
- **NPC Management** — Create and edit NPCs with AI-generated backstories, voice, and stat suggestions
- **Player & Character Tracking** — Link real players (via Discord/Clerk) to their characters and relationships
- **Lore & World Management** — Locations, quests, campaign integrations, and player availabilities linked across the campaign
- **Foundry VTT Sync** — Bidirectional sync: Foundry pushes combat/event data in, Planner pushes world state back (planned)
- **Discord Integration** — Beny Bot handles scheduling polls, session announcements, and recap delivery

---

## Architecture

Party Planner is an Nx monorepo using Bun as the runtime and package manager.

```
party-planner/
├── apps/
│   ├── web/                  # TanStack Start frontend (React 19, Tailwind v4)
│   └── api/                  # Go API — ConnectRPC/gRPC services + Beny Bot (Discord)
└── packages/
    ├── database/             # Drizzle ORM + Neon (Postgres) client & schema
    ├── proto/                # Protobuf definitions (.proto files)
    ├── schemas/              # Zod v4 validation schemas (shared)
    ├── enums/                # Shared enum definitions
    └── security/             # Auth cookie encryption utilities
```

The **Go API** (`apps/api`) is a standalone service that hosts all ConnectRPC/gRPC handlers and runs Beny Bot. The **web app** (`apps/web`) uses oRPC for server-side procedures, with ConnectRPC clients injected into oRPC middleware context to communicate with the Go API.

### Request Flow

```
Browser
  └── TanStack Start (SSR)
        └── oRPC procedures (server-side)
              └── ConnectRPC clients → Go API (gRPC/ConnectRPC)
                                          └── Neon (Postgres)

Discord
  └── Beny Bot (inside Go API)
        └── HTTP client → web app oRPC endpoints
```

oRPC handles all server-side procedure logic (auth, session management, cookie handling). ConnectRPC clients are injected into oRPC context and used to call the Go backend. Beny Bot runs inside the same Go process and calls back into the web app via an internal API key.

---

## Tech Stack

### Frontend (`apps/web`)
| Concern | Library |
|---|---|
| Framework | TanStack Start + TanStack Router |
| UI | React 19, Tailwind v4, shadcn/ui |
| Data fetching | TanStack Query |
| Auth (client) | Clerk (`@clerk/clerk-react`) |
| RPC (server-side) | oRPC (`@orpc/server`, `@orpc/client`) |
| API transport | ConnectRPC (`@connectrpc/connect-web`) |
| Validation | Zod v4 |
| Email | Resend + React Email |

### Go API (`apps/api`)
| Concern | Tool |
|---|---|
| Language | Go |
| Protocol | ConnectRPC / gRPC |
| Schema | Protobuf (defined in `packages/proto`) |
| Discord Bot | Beny Bot (co-located in the Go API process) |
| Logging | `log/slog` |

### Data & Infrastructure
| Concern | Tool |
|---|---|
| Database | Neon (Postgres) |
| ORM | Drizzle |
| Auth | Clerk + Svix (webhook verification) |
| Deployment | Railway |
| CI/CD | GitHub Actions |

### Developer Experience
| Concern | Tool |
|---|---|
| Monorepo | Nx |
| Runtime / Package Manager | Bun |
| Linting / Formatting | Biome |
| Version management | mise |

### Planned / In Progress
- **AI integration** — LLM-powered NPC backstory generation, session summaries, and DM briefs (provider TBD)
- **Foundry VTT sync** — Webhook-based bidirectional sync with Foundry

---

## Database Schema

Managed via Drizzle ORM. All schema lives in `packages/database`.

| Table | Description |
|---|---|
| `users` | Clerk-linked user accounts |
| `campaigns` | Top-level campaign records |
| `campaign_users` | Campaign membership and roles |
| `campaign_integrations` | External integrations per campaign (e.g. Foundry VTT) |
| `campaign_invitations` | Pending invites to campaigns |
| `characters` | Player characters linked to users |
| `non_player_characters` | NPCs with lore, stats, and AI-generated content |
| `sessions` | Scheduled sessions with notes and recaps |
| `user_availabilities` | Per-user availability responses for session scheduling |
| `locations` | World locations linked to sessions, NPCs, and lore |
| `quests` | Quest/plot arc tracking |
| `user_integrations` | Per-user external service connections |

---

## Getting Started

### Prerequisites

- [mise](https://mise.jdx.dev/) — manages Bun, Go, and other tool versions
- A [Neon](https://neon.tech/) Postgres database
- A [Clerk](https://clerk.com/) application
- A [Railway](https://railway.app/) project
- A Discord application and bot token (for Beny Bot)

### Setup

```bash
# Install tools (Bun, Go, etc.) via mise
mise install

# Install JS dependencies
bun install

# Copy environment files and fill in values
cp apps/web/.env.example apps/web/.env
cp apps/api/.env.example apps/api/.env

# Generate and run database migrations
bun run db:gen
bun run db:migrate

# Build shared packages (required before running the app)
bun run build:packages

# Generate protobuf types (requires buf — re-run whenever .proto files change)
bun run gen:proto

# Start the web app (development)
bun run dev

# Start the web app (development)
bun run dev

# Start the Go API (from apps/api)
make dev
```

---

## Environment Variables

### Web App (`apps/web/.env`)

| Variable | Description |
|---|---|
| `VITE_APP_URL` | Web app base URL (e.g. `http://localhost:3000`) |
| `VITE_API_URL` | Api app base URL (e.g. `"http://localhost:8000"`) |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk publishable key |
| `VITE_CLERK_SIGN_IN_URL` | Clerk sign-in route |
| `VITE_CLERK_SIGN_UP_URL` | Clerk sign-up route |
| `VITE_CLERK_AFTER_SIGN_IN_URL` | Redirect after sign-in |
| `VITE_CLERK_AFTER_SIGN_UP_URL` | Redirect after sign-up (e.g. `/onboarding`) |
| `NODE_ENV` | `development` or `production` |
| `VITE_AUTH_PUBLIC_KEY_PEM` | Public key for auth cookie encryption |
| `DATABASE_URL` | Neon/Postgres connection string |
| `CLERK_SECRET_KEY` | Clerk secret key |
| `CLERK_WEBHOOK_SIGNING_SECRET` | Svix webhook signing secret |
| `RESEND_API_KEY` | Resend email API key |
| `DISCORD_TOKEN` | Discord bot token |
| `DISCORD_API_KEY` | API key for Beny Bot → oRPC requests |
| `Internal_API_KEY` | API key for web → api requests |
| `AUTH_PRIVATE_KEY_PEM` | Private key for auth cookie decryption |

### Go API (`apps/api/.env`)

| Variable | Description |
|---|---|
| `API_KEY` | Internal API key (used by Beny Bot to call the web app) |
| `APP_URL` | Web app URL the Go API calls back to |
| `CORS_ALLOWED_ORIGINS` | Comma-separated allowed origins |
| `DATABASE_URL` | Postgres connection string |
| `DISCORD_TOKEN` | Discord bot token |
| `ENVIRONMENT` | `development` or `production` |
| `INTERNAL_API_KEY` | API key for web → api requests |
| `PORT` | Port for the ConnectRPC HTTP server (default `8000`) |

---

## Conventions

- **ESM only** — no CommonJS anywhere in JS/TS packages (`noCommonJs` enforced by Biome)
- **No `any`** — `noExplicitAny` enforced by Biome
- **No `console`** — `noConsole` enforced; use structured logging (`log/slog` in Go, `pino` in JS)
- **No `process.env`** — `noProcessEnv` enforced; use a validated env module
- **No raw SQL** — all database access through Drizzle ORM
- **No custom auth logic** — all auth flows through Clerk
- **Zod v4** for all runtime validation (sourced via `catalog:`)
- **oRPC** for all web app server-side procedures
- **ConnectRPC/gRPC** for all web app → Go API communication
- **Sorted imports, sorted keys, sorted attributes** — enforced by Biome assist
- **Tab indentation, double quotes** — enforced by Biome formatter
- **Filename conventions** — `useFilenamingConvention` enforced by Biome
