# syntax=docker/dockerfile:1

# ---------- Builder: install deps, generate Prisma client, compile ----------
FROM node:24-bookworm-slim AS builder
WORKDIR /app

# Install dependencies first (better layer caching).
COPY package*.json ./
RUN npm ci

# Copy the rest of the source and build.
COPY . .
RUN npx prisma generate
RUN npm run build

# ---------- Runner: minimal runtime image ----------
FROM node:24-bookworm-slim AS runner
ENV NODE_ENV=production
WORKDIR /app

# openssl/ca-certificates are needed by the Prisma migration engine
# (`prisma migrate deploy`); wget is used by the container healthcheck.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates wget \
  && rm -rf /var/lib/apt/lists/*

# Bring over installed deps and the compiled app. The Prisma client lives in
# node_modules (default `prisma-client-js` output), so copying node_modules is
# all that's needed — there is no separate ./generated folder to copy.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/tsconfig.json ./tsconfig.json
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000

# Migrations are applied explicitly after the stack is up (see DEPLOY_VPS.md):
#   docker compose exec api npm run prisma:migrate:deploy
# Entry point is dist/src/main.js (nest build keeps the src/ path because the
# project root is the rootDir, e.g. prisma.config.ts lives at the root).
CMD ["node", "dist/src/main.js"]
