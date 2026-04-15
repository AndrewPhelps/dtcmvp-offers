# Dockerfile — dtcmvp-offers (Next.js 16, standalone output)
# Deployed to DO droplet 142.93.27.155, host port 3005 → container port 3000.
# Subdomain: offers.dtcmvp.com (nginx proxies 443 → localhost:3004).

# ---------- Deps ----------
FROM node:20-alpine AS deps
WORKDIR /app
# better-sqlite3 is a native module — alpine has no build toolchain by default.
# python3/make/g++ let npm build the .node binding from source when no prebuild
# is available for musl.
RUN apk add --no-cache python3 make g++
COPY package.json package-lock.json* ./
RUN npm ci

# ---------- Builder ----------
FROM node:20-alpine AS builder
WORKDIR /app
# Same toolchain in case the Next.js build triggers any native rebuilds.
RUN apk add --no-cache python3 make g++

# Public env vars — baked at build time (Next.js reads NEXT_PUBLIC_* at build).
# Auth uses dtcmvp-2.0's pattern: all Supabase calls proxy through
# api.dtcmvpete.com — frontend never talks to Supabase directly.
ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_APP_URL

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_APP_URL=$NEXT_PUBLIC_APP_URL
# AUTH_API_URL is passed at runtime via docker-compose environment, not baked.

COPY --from=deps /app/node_modules ./node_modules
COPY . .

ENV NEXT_TELEMETRY_DISABLED=1

# BuildKit cache mount speeds up incremental builds
RUN --mount=type=cache,target=/app/.next/cache npm run build

# ---------- Runner ----------
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Non-root user
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000
ENV PORT=3000
# Must be 0.0.0.0 so the docker healthcheck (wget 127.0.0.1:3000) can reach it.
ENV HOSTNAME=0.0.0.0

CMD ["node", "server.js"]
