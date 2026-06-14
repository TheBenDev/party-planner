# Build stage: use Bun to install deps and build the app
# Build context must be the repo root (Railway: set Root Directory = /)
FROM oven/bun:1.3.10 AS base

# Install dependencies
FROM base AS deps
WORKDIR /app

# Copy workspace manifests and config for layer caching
COPY package.json bun.lock bunfig.toml ./
COPY apps ./apps
COPY packages ./packages

RUN bun install --frozen-lockfile

# Builder stage
FROM base AS builder
WORKDIR /app

ARG VITE_API_URL
ARG VITE_APP_URL
ARG VITE_CLERK_AFTER_SIGN_IN_URL
ARG VITE_CLERK_AFTER_SIGN_UP_URL
ARG VITE_CLERK_PUBLISHABLE_KEY
ARG VITE_CLERK_SIGN_IN_URL
ARG VITE_CLERK_SIGN_UP_URL
ARG VITE_DISCORD_CLIENT_ID
ARG VITE_GOOGLE_CLIENT_ID

ENV VITE_API_URL=$VITE_API_URL
ENV VITE_APP_URL=$VITE_APP_URL
ENV VITE_CLERK_AFTER_SIGN_IN_URL=$VITE_CLERK_AFTER_SIGN_IN_URL
ENV VITE_CLERK_AFTER_SIGN_UP_URL=$VITE_CLERK_AFTER_SIGN_UP_URL
ENV VITE_CLERK_PUBLISHABLE_KEY=$VITE_CLERK_PUBLISHABLE_KEY
ENV VITE_CLERK_SIGN_IN_URL=$VITE_CLERK_SIGN_IN_URL
ENV VITE_CLERK_SIGN_UP_URL=$VITE_CLERK_SIGN_UP_URL
ENV VITE_DISCORD_CLIENT_ID=$VITE_DISCORD_CLIENT_ID
ENV VITE_GOOGLE_CLIENT_ID=$VITE_GOOGLE_CLIENT_ID

# Copy workspace config
COPY package.json bun.lock bunfig.toml ./

# Copy source
COPY apps/web/ ./apps/web/
COPY packages/database/ ./packages/database/
COPY packages/enums/ ./packages/enums/
COPY packages/schemas/ ./packages/schemas/
COPY packages/security/ ./packages/security/
COPY tsconfig.base.json ./tsconfig.base.json

# Copy node_modules from deps (isolated linker gives each package its own)
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=deps /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=deps /app/packages/enums/node_modules ./packages/enums/node_modules
COPY --from=deps /app/packages/schemas/node_modules ./packages/schemas/node_modules
COPY --from=deps /app/packages/security/node_modules ./packages/security/node_modules

# Build web
RUN bun nx run web:build
RUN bun build apps/web/.output/server/index.mjs --compile --target=bun-linux-x64 --minify --outfile apps/web/.output/server-bin

# Runtime stage
FROM gcr.io/distroless/cc-debian12:nonroot
WORKDIR /app

COPY --from=builder /app/apps/web/.output/server-bin ./server-bin

ENV PORT=3000
EXPOSE 3000
CMD ["./server-bin"]
