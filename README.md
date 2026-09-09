# ✅ MarkIt — Meeting Bingo

Make your weekly team meetings infinitely more fun with shared bingo boards in real time.

---

## Table of contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Architecture](#architecture)
- [Project structure](#project-structure)
- [Local development](#local-development)
- [GitHub CI / CD](#github-ci--cd)
- [Production deployment](#production-deployment)
- [Apache configuration](#apache-configuration)
- [Environment variables](#environment-variables)
- [Database](#database)
- [Security](#security)
- [Useful commands](#useful-commands)

---

## Features

### Team management

- Create a team and invite members with a unique **invite code**
- Join an existing team with the code
- Roles: `OWNER`, `ADMIN`, `MEMBER`

### Board creation

- Board size is **fully configurable** (rows × columns, from 2×2 to 10×10)
- Optional **FREE center cell** (only available on odd-sized boards)
- Fill from a **bank of 35 classic meeting phrases** (predefined)
- Ability to **add your own phrases** with an emoji
- **Random** cell generation from the selected phrases

### Live play in meetings

- The whole team shares the **same board in real time** via Socket.io
- Clicking a cell checks it **instantly for every participant**
- **Automatic bingo detection**: rows, columns, diagonals (on square boards)
- **Animated celebration** with confetti and a banner when bingo is detected
- **Online members** shown during the session

### History

- Past boards are kept with their date and completion rate
- Progress is visible (checked cells / total)

---

## Tech stack

| Layer | Technology |
| -------- | ------------- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Language | TypeScript |
| Styles | [Tailwind CSS](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) + [react-confetti](https://www.npmjs.com/package/react-confetti) |
| Authentication | [NextAuth.js v4](https://next-auth.js.org/) (email/password) |
| Database | PostgreSQL 16 via [Prisma ORM](https://www.prisma.io/) |
| Real time | [Socket.io](https://socket.io/) (custom Node.js server) |
| Deployment | Docker Compose |
| Reverse proxy | Apache 2.4 |

---

## Architecture

```text
Internet
    │
    │ HTTPS :443
    ▼
┌─────────────┐
│  Apache 2.4 │  ← SSL termination, security headers, HSTS
│ (host)      │
└──────┬──────┘
       │ HTTP 127.0.0.1:3000
       │ WS   127.0.0.1:3000  (Socket.io)
       ▼
┌─────────────────────────────┐
│  Docker network: internal   │
│                             │
│  ┌─────────────────────┐    │
│  │  markit_app         │    │
│  │  Next.js + Socket.io│    │
│  │  port 3000          │    │
│  └──────────┬──────────┘    │
│             │               │
│  ┌──────────▼──────────┐    │
│  │  markit_db          │    │
│  │  PostgreSQL 16      │    │
│  │  (not exposed)      │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

- The app is **only reachable via `127.0.0.1:3000`** from the host — never directly from the Internet.
- The database **exposes no ports** to the outside.
- Apache handles SSL, HTTP→HTTPS redirects, and security headers.

---

## Project structure

```text
markit/
├── .github/
│   ├── workflows/ci.yml       # GitHub Actions CI/CD pipeline
│   └── dependabot.yml         # Automatic updates (npm, Actions, Docker)
├── apache/
│   └── markit.conf           # Apache VirtualHost configuration
├── prisma/
│   ├── migrations/            # Versioned Prisma migrations
│   ├── schema.prisma          # Database schema
│   └── seed.mjs               # Seed data (35 default phrases)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── account/       # Profile / password
│   │   │   ├── admin/         # Admin (users, invites)
│   │   │   ├── auth/          # NextAuth + email signup
│   │   │   ├── cards/         # Board API (fetch, activate, check cells)
│   │   │   └── teams/         # Team API (CRUD, join, phrases)
│   │   ├── account/           # Account settings
│   │   ├── admin/             # Admin console
│   │   ├── auth/
│   │   │   ├── signin/        # Sign-in page
│   │   │   └── signup/        # Sign-up page
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Team list
│   │   │   └── teams/[teamId]/
│   │   │       ├── page.tsx       # Team board list
│   │   │       └── create/        # Board creator
│   │   └── play/[cardId]/     # Real-time play page
│   ├── components/
│   │   ├── admin/
│   │   ├── account-settings-form/
│   │   ├── dashboard/
│   │   ├── landing-hero/
│   │   └── navbar/
│   ├── lib/
│   │   ├── account.ts         # Profile and password validation
│   │   ├── api-auth.ts        # API session guards
│   │   ├── auth.ts            # NextAuth configuration
│   │   ├── bingo.ts           # Bingo detection logic
│   │   ├── prisma.ts          # Prisma client singleton
│   │   ├── schemas/           # Zod schemas (API inputs)
│   │   └── socket.ts          # Socket.io client
│   └── types/
│       └── index.ts           # Shared TypeScript types
├── .env.example               # Environment variable template
├── docker-compose.yml         # Container orchestration
├── Dockerfile                 # Application image
├── next.config.js             # Next.js config + security headers
├── server.js                  # Custom Node.js server (Next.js + Socket.io)
└── tailwind.config.ts
```

---

## Local development

### Prerequisites

- Node.js 24 (see `.nvmrc`; `engines`: `>=24 <25`)
- Docker + Docker Compose
- `npm`

### Setup

```bash
# 1. Clone the project
git clone <repo> markit && cd markit

# 2. Install dependencies
npm install

# 3. Copy and configure environment variables
cp .env.example .env
```

Edit `.env` (defaults work for local development):

```env
DATABASE_URL="postgresql://markit:markit_password@localhost:5432/markit"
PORT=3000
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<generate with: openssl rand -base64 32>"
```

If port **3000** is already in use (another local app), change `PORT` and `NEXTAUTH_URL` together, e.g. `PORT=3001` and `NEXTAUTH_URL="http://localhost:3001"`.

```bash
# 4. Start PostgreSQL
docker compose up postgres -d

# 5. Apply migrations (or db:push while prototyping)
npm run db:migrate:deploy

# 6. Load the 35 default phrases (+ admin if ADMIN_* is set)
npm run db:seed

# 7. Start the development server
npm run dev
```

The app is available at **<http://localhost:3000>**.

Before pushing, run the local checks:

```bash
npm run ci        # Node, NEXTAUTH_SECRET, Prisma generate, lint, markdownlint, typecheck, tests
npm run ci:full   # same + npm audit (high+, production deps only)
```

Husky runs `npm run ci` on `pre-push` and [commitlint](https://commitlint.js.org/) on `commit-msg` (Conventional Commits).

On first Docker start, `scripts/docker-entrypoint.sh` runs `prisma migrate deploy`, seeds the database, then starts the server. Set `ADMIN_EMAIL` / `ADMIN_PASSWORD` (≥ 12 characters) to create the initial admin account (`mustChangePassword` → redirect to `/account`).

### Manual checklist (after deploy)

1. Admin sign-in → `/account` on first login
2. Dashboard → create / join a team
3. Create a board → play → real-time cells
4. Admin → generate an invite → signup

---

## GitHub CI / CD

The [`.github/workflows/ci.yml`](.github/workflows/ci.yml) workflow runs on every push and pull request to `main` (changes under `.cursor/` are ignored).

| Job | Trigger | Role |
| --- | --- | --- |
| `quality` | push / PR to `main` | `npm ci` then `npm run ci:full` |
| `docker` | PR to `main` only | Docker build (validation, **no** image push) |
| `release` | push to `main` (after `quality`) | semantic-release, then push GHCR image if a version is published |

### `quality` checks

`npm run ci:full` runs:

1. Node.js version check
2. Presence / format of `NEXTAUTH_SECRET`
3. `prisma generate`
4. ESLint (`npm run lint`)
5. Markdownlint (`npm run lint:md`)
6. TypeScript (`npm run typecheck`)
7. npm audit (`npm run audit:ci`, severity ≥ high, production deps only)

Locally, `npm run ci` skips the network audit; `npm run ci:full` enables it (as in CI).

### `docker` job (PR)

On a pull request, the Dockerfile is built with Buildx to validate the image. Nothing is pushed to GHCR at this step (production push stays in `release`). Build cache is shared via GHCR (`buildcache`) and the GitHub Actions cache.

### Releases (semantic-release)

Config: [`release.config.cjs`](release.config.cjs). On every successful push to `main`, semantic-release computes the version from [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …) and may publish:

- a Git tag `vX.Y.Z`
- a GitHub Release
- updates to `CHANGELOG.md`, `package.json`, and `package-lock.json`
- a `chore(release): … [skip ci]` commit

Then, if a release was published, the Docker image is pushed to `ghcr.io/<org>/markit` with tags `vX.Y.Z`, `X.Y`, and `latest` (the latter only for a stable version, not a pre-release).

### Secrets and permissions

**Secrets** (Settings → Secrets and variables → Actions):

- `RELEASE_APP_ID` — ID of the GitHub App used to publish releases
- `RELEASE_APP_PRIVATE_KEY` — private key for that App

The GitHub App pushes release commits / tags (useful with branch protection). GHCR images use `GITHUB_TOKEN` (`packages: write` on the `docker` and `release` jobs).

Also check **Settings → Actions → General → Workflow permissions** → *Read and write permissions* if needed for GHCR.

### Dependabot

[`.github/dependabot.yml`](.github/dependabot.yml) opens PRs every Monday for:

| Ecosystem | Target | Groups / ignore |
| --- | --- | --- |
| `npm` | `package.json` / lockfile | groups `next`, `prisma`, `dev-tools`; major updates for `@types/node` and `typescript` ignored |
| `github-actions` | workflow SHA pins | — |
| `docker` | `Dockerfile` (including digests) | major updates for the `node` image ignored |

PR commits / titles use `chore(deps): …` / `chore(deps-dev): …`. With the current semantic-release `releaseRules`, those scopes trigger a **patch** release when merged to `main`.

**Enable on GitHub** (Settings → Advanced Security, or the Security tab):

1. Dependency graph
2. Dependabot alerts
3. Dependabot security updates
4. Dependabot version updates (picks up `dependabot.yml` on `main`)

Then **Settings → Actions → General**: *Allow GitHub Actions to create and approve pull requests* if you want Dependabot to re-run CI / rebase cleanly.

### Recommended workflow

```bash
npm run ci
git checkout -b feat/my-feature
git add .
git commit -m "feat: short description"
git push -u origin feat/my-feature
```

Open a PR to `main`, then merge (ideally squash-merge with a conventional title). semantic-release runs on the resulting push to `main`.

---

## Production deployment

### Server prerequisites

- Docker + Docker Compose
- Apache 2.4 with modules: `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, `headers`, `ssl`
- A domain name pointing at the server
- Certbot (Let's Encrypt) for the SSL certificate

### Step 1 — Prepare the files

```bash
git clone <repo> /opt/markit && cd /opt/markit
cp .env.example .env
```

### Step 2 — Configure environment variables

```bash
# Generate secrets
openssl rand -base64 32   # → POSTGRES_DB_PASSWORD
openssl rand -base64 32   # → NEXTAUTH_SECRET
```

Edit `/opt/markit/.env`:

```env
POSTGRES_USER=markit
POSTGRES_DB=markit
POSTGRES_DB_PASSWORD=<generated secret>

NEXTAUTH_URL=https://markit.example.com
NEXTAUTH_SECRET=<generated secret>
```

### Step 3 — Build and start the containers

```bash
docker compose up -d --build
```

Containers start, migrations are applied automatically, and default phrases are loaded.

Verify everything is running:

```bash
docker compose ps
docker compose logs -f app
```

### Step 4 — Configure Apache

Enable required modules:

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
```

Obtain the SSL certificate:

```bash
certbot certonly --standalone -d markit.example.com
```

Copy and enable the Apache configuration:

```bash
# Adapt ServerName in the file
cp /opt/markit/apache/markit.conf /etc/apache2/sites-available/markit.conf
# Replace markit.example.com with your real domain
nano /etc/apache2/sites-available/markit.conf

a2ensite markit.conf
apache2ctl configtest     # Check syntax
systemctl reload apache2
```

The site is now available at **<https://markit.example.com>**.

### Step 5 — Automatic SSL renewal

Certbot installs an automatic cron job. Verify with:

```bash
certbot renew --dry-run
```

---

## Apache configuration

The `apache/markit.conf` file configures:

| Feature | Detail |
| --- | --- |
| HTTP→HTTPS redirect | Permanent `RewriteRule` (301) |
| SSL/TLS | TLS 1.2 and 1.3 only, modern ciphers |
| HSTS | `max-age=63072000; includeSubDomains; preload` (2 years) |
| HTTP proxy | `ProxyPass` to `127.0.0.1:3000` |
| WebSocket proxy | `RewriteRule` to `ws://127.0.0.1:3000` for Socket.io |
| Security headers | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| Forwarded headers | `X-Forwarded-Proto: https` sent to Next.js |

> **Important**: replace `markit.example.com` with your real domain in the file.

---

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `POSTGRES_USER` | production | PostgreSQL user (default: `markit`) |
| `POSTGRES_DB` | production | Database name (default: `markit`) |
| `POSTGRES_DB_PASSWORD` | **yes** | PostgreSQL password (`openssl rand -base64 32` is fine — encoded at Docker startup) |
| `DATABASE_URL` | optional | Full URL; in Docker prod, leave empty (built by the entrypoint). For local dev, URL to `localhost` |
| `PORT` | optional | HTTP port (default `3000`). For local/Docker: keep `NEXTAUTH_URL` in sync |
| `NEXTAUTH_URL` | **yes** | Public site URL (`https://...` in prod, `http://localhost:<PORT>` in dev) |
| `NEXTAUTH_SECRET` | **yes** | JWT signing key — generate with `openssl rand -base64 32` |

---

## Database

### Schema

```text
User          → user account
Team          → team with invite code
TeamMember    → user↔team membership (role: OWNER/ADMIN/MEMBER)
Phrase        → phrase bank entry (isDefault=true for shared phrases)
BingoCard     → bingo board (rows × cols, freeCenter)
Cell          → board cell (phrase + position)
CheckedCell   → checked cell (by which user, when)
```

### Commands

```bash
npm run db:migrate:deploy  # Apply migrations (prod / Docker)
npm run db:migrate         # Create a migration (dev)
npm run db:push            # Sync schema without a migration (prototyping)
npm run db:seed            # Load phrases + admin if configured
npm run db:studio          # Open Prisma Studio
npm run db:generate        # Regenerate the Prisma client
```

### Backup

```bash
# Dump
docker exec markit_db pg_dump -U markit markit > backup_$(date +%Y%m%d).sql

# Restore
docker exec -i markit_db psql -U markit markit < backup_20260101.sql
```

---

## Security

### What is already in place

| Measure | Implementation | Detail |
| --- | --- | --- |
| Forced HTTPS | Apache 301 redirect + HSTS | 2 years, includeSubDomains, preload |
| Secure cookies | `Secure` + `HttpOnly` when HTTPS | Via NextAuth `useSecureCookies` |
| Passwords | **bcrypt** (cost 12) | ~300ms/attempt, resistant to rainbow tables |
| JWT sessions | Signed with `NEXTAUTH_SECRET`, 7 days | Token invalidated if the secret changes |
| API authorization | Team membership checks | Protection against IDOR attacks |
| Socket.io auth | NextAuth JWT verified server-side | `userName` is resolved on the server, not forgeable |
| Socket.io CORS | Restricted to `NEXTAUTH_URL` in prod | `*` only in dev |
| CSP | Separate for dev/prod, no `unsafe-eval` in prod | Helps mitigate XSS |
| X-Frame-Options | `SAMEORIGIN` | Anti-clickjacking |
| X-Content-Type-Options | `nosniff` | Anti-MIME sniffing |
| X-Forwarded-For | Overwritten by Apache | Prevents client IP spoofing |
| Request size | Apache `LimitRequestBody 1MB` | Mitigates simple DoS |
| Field lengths | Validated server-side on all APIs | Prevents oversized payloads |
| Isolated ports | App on `127.0.0.1`, DB with no public port | Unreachable from the Internet |
| Server headers | `X-Powered-By` and `Server` removed | Does not reveal the stack |
| TLS | TLS 1.2/1.3 only, AEAD ciphers | SSLv3/TLS 1.0/1.1 disabled |

### What remains on you

- **Auth rate limiting** — implement with Fail2ban or Apache `mod_ratelimit` on `/api/auth/signin` and `/api/auth/register` to limit brute-force attempts.

  Example Fail2ban filter (`/etc/fail2ban/filter.d/markit-auth.conf`):

  ```ini
  [Definition]
  failregex = ^<HOST> .* "POST /api/auth/callback/credentials HTTP.*" 401
  ignoreregex =
  ```

- **HSTS preload submission** — the `preload` header is set, but submission to <https://hstspreload.org/> must be done manually once the domain is stable.

- **Regular updates**:

  ```bash
  docker compose pull && docker compose up -d --build
  npm audit fix
  ```

- **Log monitoring** — watch `markit_error.log` and Docker logs for unusual behavior.

---

## Useful commands

```bash
# ── Development ─────────────────────────────────────────────
npm run dev              # Development server (port 3000)
npm run build            # Production build
npm run lint             # ESLint
npm run lint:md          # Markdownlint
npm run typecheck        # TypeScript check
npm run test             # Unit tests (bingo, account, authz)
npm run ci               # Local checks (no network audit)
npm run ci:full          # Full CI checks (+ npm audit)
npm run release          # semantic-release (used by the CI job)

# ── Database ────────────────────────────────────────────────
npm run db:migrate:deploy # Apply migrations
npm run db:migrate       # Create + apply a migration (dev)
npm run db:push            # Sync schema (prototyping)
npm run db:seed            # Load default phrases
npm run db:studio          # Prisma Studio UI

# ── User account ────────────────────────────────────────────
# /account page: first name + password change (all users)

# ── Docker ──────────────────────────────────────────────────
docker compose up -d              # Start all services
docker compose up -d --build      # Rebuild + start
docker compose down               # Stop services
docker compose logs -f app        # App logs
docker compose logs -f postgres   # Database logs
docker compose restart app        # Restart the app

# ── Database backup ─────────────────────────────────────────
docker exec markit_db pg_dump -U markit markit > backup.sql
docker exec -i markit_db psql -U markit markit < backup.sql
```
