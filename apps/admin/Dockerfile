# Debian-based (not Alpine/musl): sharp only ships a glibc prebuild here
# (@img/sharp-linux-x64, no @img/sharp-linux-x64-musl in the lockfile) — on
# Alpine it would fail to load its native binding at runtime. The DB driver
# (pg) is pure JS, so unlike the old better-sqlite3 setup there's no Node
# engine floor to worry about here.

FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# DATABASE_URL and SESSION_SECRET just need to be syntactically valid here —
# nothing actually connects/authenticates during build, but src/lib/db.ts and
# src/lib/session.ts throw at import time if these are missing, which
# page-data collection hits (e.g. /posts/[id]/edit).
ENV DATABASE_URL=postgres://build:build@localhost:5432/build
ENV SESSION_SECRET=0000000000000000000000000000000000000000000000000000000000000000
RUN npm run build

FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN groupadd --system --gid 1001 nodejs && useradd --system --uid 1001 --gid nodejs nextjs

COPY --from=builder /app/public ./public
# public/uploads/ (cover images) is mounted as a volume in docker-compose.yml
# — created here just so the non-root user owns it before the volume mount,
# otherwise Docker would create it as root.
RUN mkdir -p public/uploads/covers .next && chown -R nextjs:nodejs public/uploads .next

# Standalone output ships its own trimmed node_modules + server.js — it
# overwrites /app, so it must be copied after `public` above, and `.next/static`
# + `public` are excluded from it by design and need copying separately.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
