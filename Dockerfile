# ==============================================================================
# crave. Multi-Stage Production Dockerfile
# Optimized for Next.js App Router, Prisma ORM, WebSocket Server, and PaaS
# ==============================================================================

# ─── Stage 1: Base Alpine Runtime ─────────────────────────────────────────────
FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl dumb-init
WORKDIR /app
ENV NODE_ENV=production

# ─── Stage 2: Dependencies & Application Build ────────────────────────────────
FROM base AS builder
WORKDIR /app

# Enable pnpm matching project requirements
RUN corepack enable pnpm && (corepack prepare pnpm@12.8.1 --activate || npm install -g pnpm@12.8.1)

# Copy dependency manifests and workspace configuration first (maximizes layer caching)
COPY package.json pnpm-lock.yaml .npmrc* pnpm-workspace.yaml* ./
RUN pnpm install --frozen-lockfile || pnpm install --no-frozen-lockfile

# Copy application source code
COPY . .

# Dummy fallback database URL for build-time Prisma Client code generation
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/crave?schema=public"}

# Generate Prisma Client and compile the production Next.js application bundle
RUN npx prisma generate
RUN pnpm run build

# ─── Stage 3: Hardened Production Runner ──────────────────────────────────────
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV WS_PORT=8000

# Create unprivileged system group & user for container security compliance
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy artifacts from builder with unprivileged ownership
COPY --from=builder --chown=nextjs:nodejs /app/.next ./.next
COPY --from=builder --chown=nextjs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nodejs /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=builder --chown=nextjs:nodejs /app/ws-server.js ./ws-server.js
COPY --from=builder --chown=nextjs:nodejs /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=nextjs:nodejs /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nodejs /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/scripts/docker-entrypoint.sh ./scripts/docker-entrypoint.sh

# Ensure executable entrypoint and writable Next.js image/fetch cache directory
RUN chmod +x ./scripts/docker-entrypoint.sh && \
    mkdir -p /app/.next/cache && \
    chown -R nextjs:nodejs /app/.next/cache

USER nextjs

# Expose HTTP application port and WebSocket port
EXPOSE 3000
EXPOSE 8000

# Production HTTP liveness probe
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const r=http.get('http://localhost:'+(process.env.PORT||3000)+'/api/health',{timeout:3000},(res)=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

ENTRYPOINT ["dumb-init", "--", "./scripts/docker-entrypoint.sh"]
CMD ["node", "server.js"]
