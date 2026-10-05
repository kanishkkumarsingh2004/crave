FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
ENV NODE_ENV=production

FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
RUN corepack enable pnpm && corepack prepare pnpm@12.3.4 --activate
RUN pnpm install --no-frozen-lockfile
COPY . .
ARG DATABASE_URL
ENV DATABASE_URL=${DATABASE_URL:-postgresql://placeholder:placeholder@placeholder:5432/placeholder?schema=public}
RUN npx prisma generate
RUN pnpm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/server.js ./server.js
COPY --from=builder /app/ws-server.js ./ws-server.js
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/next-env.d.ts ./next-env.d.ts
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/public ./public

EXPOSE 3000 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const http=require('http');const r=http.get('http://localhost:3000/api/health',{timeout:3000},(res)=>{process.exit(res.statusCode===200?0:1)});r.on('error',()=>process.exit(1))"

CMD ["node", "server.js"]
