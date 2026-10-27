FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
# CR-09 FIX: Create a dedicated non-root runtime user with a fixed UID.
# The app should never run as root inside the container.
RUN addgroup --system --gid 1001 cravegroup && \
    adduser --system --uid 1001 --gid 1001 --shell /bin/sh --disabled-password craveuser
WORKDIR /app
ENV NODE_ENV=production

FROM base AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable pnpm && corepack prepare pnpm@12.3.4 --activate
RUN pnpm install --frozen-lockfile
COPY . .
# Prisma generate needs a database URL - use build arg for build time only
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-"postgresql://postgres:postgres@localhost:5432/crave?schema=public"}
RUN npx prisma generate
RUN pnpm run build

FROM base AS runner
WORKDIR /app
ENV NODE_ENV=production

# CR-09 FIX: Copy artifacts as the non-root user so the runtime user owns them.
COPY --from=builder --chown=craveuser:cravegroup /app/.next ./.next
COPY --from=builder --chown=craveuser:cravegroup /app/node_modules ./node_modules
COPY --from=builder --chown=craveuser:cravegroup /app/prisma ./prisma
COPY --from=builder --chown=craveuser:cravegroup /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder --chown=craveuser:cravegroup /app/server.js ./server.js
COPY --from=builder --chown=craveuser:cravegroup /app/ws-server.js ./ws-server.js
COPY --from=builder --chown=craveuser:cravegroup /app/next.config.mjs ./next.config.mjs
COPY --from=builder --chown=craveuser:cravegroup /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder --chown=craveuser:cravegroup /app/package.json ./package.json
COPY --from=builder --chown=craveuser:cravegroup /app/public ./public

# CR-09 FIX: Create writable directories for the non-root user.
# Next.js writes to .next/cache and the app may need a tmp directory.
RUN mkdir -p /app/.next/cache /app/tmp && \
    chown -R craveuser:cravegroup /app && \
    chmod -R u+rwX /app

# CR-09 FIX: Only expose public HTTP port (3000)
# WebSocket port (8000) kept internal via Docker network
EXPOSE 3000

# CR-09 FIX: Switch to the non-root user before starting the app.
USER craveuser:cravegroup

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const r=http.get('http://localhost:3000/api/health',{timeout:3000},(res)=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
