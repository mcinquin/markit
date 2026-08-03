# syntax=docker/dockerfile:1.7

# ── Étape 1 : dépendances ─────────────────────────────────────────────────────
FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS deps
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
  apk add --update-cache --cache-dir /var/cache/apk libc6-compat openssl

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
  HUSKY=0 npm ci --prefer-offline --no-audit

# ── Étape 2 : build ───────────────────────────────────────────────────────────
FROM deps AS builder

ENV NEXT_TELEMETRY_DISABLED=1
# Placeholder pour prisma generate / next build (pas de connexion réelle)
ENV DATABASE_URL="postgresql://placeholder:placeholder@localhost:5432/placeholder"

COPY . .

RUN npx prisma generate
RUN --mount=type=cache,target=/app/.next/cache \
  npm run build

# ── Étape 3 : image de production ─────────────────────────────────────────────
FROM node:24-alpine@sha256:f70403e87646dc51b45295f4b8b70cdad0b63d2297c4c9899119b03f7af7a6b3 AS runner
WORKDIR /app

RUN --mount=type=cache,target=/var/cache/apk \
  apk add --update-cache --cache-dir /var/cache/apk openssl libc6-compat

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

RUN addgroup --system --gid 1111 markit \
 && adduser  --system --uid 1111 --ingroup markit markit

# Custom server (server.js + Socket.io) : on conserve node_modules runtime
COPY --from=builder --chown=markit:markit /app/public ./public
COPY --from=builder --chown=markit:markit /app/.next/standalone ./
COPY --from=builder --chown=markit:markit /app/.next/static ./.next/static
COPY --from=builder --chown=markit:markit /app/prisma ./prisma
COPY --from=builder --chown=markit:markit /app/server.js ./server.js
COPY --from=builder --chown=markit:markit /app/package.json ./package.json
COPY --from=builder --chown=markit:markit /app/node_modules ./node_modules
COPY --from=builder --chmod=755 /app/scripts/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh

RUN rm -rf \
  /sbin/apk \
  /etc/apk \
  /lib/apk \
  /var/cache/apk \
  /var/lib/apk \
  /usr/local/bin/corepack \
  /usr/local/bin/npm \
  /usr/local/bin/npx \
  /usr/local/lib/node_modules/corepack \
  /usr/local/lib/node_modules/npm

USER markit

# Pas de EXPOSE fixe : le port est défini par PORT au runtime (défaut 3000).

HEALTHCHECK --interval=30s --timeout=5s --start-period=40s --retries=3 \
  CMD node -e "const p=process.env.PORT||3000;fetch('http://127.0.0.1:'+p+'/').then((r)=>process.exit(r.status<500?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/usr/local/bin/docker-entrypoint.sh"]
