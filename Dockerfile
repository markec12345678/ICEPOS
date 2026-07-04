# ============================================================
# Gostilna POS — Dockerfile (multi-stage build)
# ============================================================

# --- Stage 1: Dependencies ---
FROM oven/bun:1.1 AS deps
WORKDIR /app

# Kopiraj samo manifest za caching
COPY package.json bun.lock* ./
COPY prisma ./prisma

# Namesti vse odvisnosti (vključno z devDependencies za build)
RUN bun install --frozen-lockfile

# Generisi Prisma client
RUN bunx prisma generate

# --- Stage 2: Build ---
FROM oven/bun:1.1 AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma ./prisma
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

# Build Next.js
RUN bun run build

# --- Stage 3: Production ---
FROM oven/bun:1.1-slim AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# Za potrebe runtime (prisma client)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts

# Mapa za SQLite bazo (volume mount point)
RUN mkdir -p /app/db

EXPOSE 3000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3000/api || exit 1

CMD ["bun", "run", "start"]
