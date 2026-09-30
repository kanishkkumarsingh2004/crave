# ============================================================
# Multi-Role Delivery Platform — Dockerfile (Next.js Admin & API)
# ============================================================

FROM node:20-alpine AS base
WORKDIR /app
RUN npm install -g pnpm@9.15.4

# Stage 1: Dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY packages/ ./packages/
COPY apps/admin-web/package.json ./apps/admin-web/
COPY prisma/ ./prisma/
RUN pnpm install --frozen-lockfile

# Stage 2: Builder
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages ./packages
COPY . .
ENV NODE_ENV=production
RUN pnpm run prisma:generate
RUN pnpm --filter admin-web build

# Stage 3: Runner
FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000

COPY --from=builder /app/apps/admin-web/public ./apps/admin-web/public
COPY --from=builder /app/apps/admin-web/.next/standalone ./
COPY --from=builder /app/apps/admin-web/.next/static ./apps/admin-web/.next/static
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000

CMD ["node", "apps/admin-web/server.js"]
