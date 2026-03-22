# Build stage: use Bun to install deps and build the app
# Build context must be the repo root (Railway: set Root Directory = /)
FROM oven/bun:1.3.10 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace manifests and config for layer caching
COPY package.json bun.lock bunfig.toml ./
COPY apps/web/package.json ./apps/web/

RUN bun install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

# Copy workspace config
COPY package.json bun.lock bunfig.toml ./

# Copy source
COPY apps/web/ ./apps/web/

# Copy node_modules from deps (isolated linker gives each package its own)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules

# Build web
WORKDIR /app/apps/web
RUN bun run build
RUN bun build .output/server/index.mjs --compile --target=bun-linux-x64 --minify --outfile .output/server-bin

# Runtime stage
FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app

COPY --from=builder /app/apps/web/.output/server-bin ./server-bin

ENV PORT=3000
EXPOSE 3000
CMD ["./server-bin"]
