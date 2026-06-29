# ============================================================
# Kitchen Service — Dockerfile
# ============================================================
# WebSocket service (socket.io) za real-time kuhinjo.
# =====================================================================

FROM oven/bun:1.1-slim

WORKDIR /app

# Kopiraj manifest in instaliraj
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Kopiraj source
COPY index.ts ./
COPY start.sh ./

ENV PORT=3003
ENV NODE_ENV=production

EXPOSE 3003

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3003/health || exit 1

CMD ["bun", "index.ts"]
