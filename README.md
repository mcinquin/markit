# ✅ MarkIt — Meeting Bingo

Rendez vos réunions d'équipe hebdomadaires infiniment plus fun avec des grilles de bingo partagées en temps réel.

---

## Table des matières

- [Fonctionnalités](#fonctionnalités)
- [Stack technique](#stack-technique)
- [Architecture](#architecture)
- [Structure du projet](#structure-du-projet)
- [Développement local](#développement-local)
- [CI / CD GitHub](#ci--cd-github)
- [Déploiement en production](#déploiement-en-production)
- [Configuration Apache](#configuration-apache)
- [Variables d'environnement](#variables-denvironnement)
- [Base de données](#base-de-données)
- [Sécurité](#sécurité)
- [Commandes utiles](#commandes-utiles)

---

## Fonctionnalités

### Gestion des équipes

- Créer une équipe et inviter des membres via un **code d'invitation** unique
- Rejoindre une équipe existante avec le code
- Rôles : `OWNER`, `ADMIN`, `MEMBER`

### Création de grilles

- Grille de taille **entièrement configurable** (lignes × colonnes, de 2×2 à 10×10)
- **Case centrale FREE** optionnelle (activable uniquement sur les grilles de taille impaire)
- Remplissage depuis une **banque de 35 phrases** classiques de réunion (prédéfinies)
- Possibilité d'**ajouter ses propres phrases** avec un emoji
- Génération **aléatoire** des cases à partir des phrases sélectionnées

### Jeu en réunion

- Toute l'équipe partage la **même grille en temps réel** via Socket.io
- Cliquer une case la coche **instantanément pour tous les participants**
- **Détection automatique du bingo** : lignes, colonnes, diagonales (sur grilles carrées)
- **Célébration animée** avec confettis et bannière quand un bingo est détecté
- Affichage des **membres en ligne** pendant la session

### Historique

- Toutes les grilles passées sont conservées avec leur date et leur taux de complétion
- Progression visible (nombre de cases cochées / total)

---

## Stack technique

| Couche | Technologie |
| -------- | ------------- |
| Framework | [Next.js 16](https://nextjs.org/) (App Router) |
| Langage | TypeScript |
| Styles | [Tailwind CSS](https://tailwindcss.com/) |
| Animations | [Framer Motion](https://www.framer.com/motion/) + [react-confetti](https://www.npmjs.com/package/react-confetti) |
| Authentification | [NextAuth.js v4](https://next-auth.js.org/) (email/mot de passe) |
| Base de données | PostgreSQL 16 via [Prisma ORM](https://www.prisma.io/) |
| Temps réel | [Socket.io](https://socket.io/) (serveur custom Node.js) |
| Déploiement | Docker Compose |
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
│ (hôte)      │
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
│  │  (non exposé)       │    │
│  └─────────────────────┘    │
└─────────────────────────────┘
```

- L'application est **uniquement accessible via `127.0.0.1:3000`** depuis l'hôte — jamais depuis Internet directement.
- La base de données **n'expose aucun port** vers l'extérieur.
- Apache gère le SSL, les redirections HTTP→HTTPS et les en-têtes de sécurité.

---

## Structure du projet

```text
markit/
├── .github/
│   ├── workflows/ci.yml       # Pipeline CI/CD GitHub Actions
│   └── dependabot.yml         # Mises à jour automatiques (npm, Actions, Docker)
├── apache/
│   └── markit.conf           # Configuration VirtualHost Apache
├── prisma/
│   ├── schema.prisma          # Schéma de la base de données
│   └── seed.ts                # Données initiales (35 phrases par défaut)
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   ├── auth/          # NextAuth + inscription email
│   │   │   ├── cards/         # API grilles (récupérer, activer, cocher cases)
│   │   │   └── teams/         # API équipes (CRUD, rejoindre, phrases)
│   │   ├── auth/
│   │   │   ├── signin/        # Page de connexion
│   │   │   └── signup/        # Page d'inscription
│   │   ├── dashboard/
│   │   │   ├── page.tsx       # Liste des équipes
│   │   │   └── teams/[teamId]/
│   │   │       ├── page.tsx       # Liste des grilles de l'équipe
│   │   │       └── create/        # Créateur de grille
│   │   └── play/[cardId]/     # Page de jeu en temps réel
│   ├── components/
│   │   └── Navbar.tsx
│   ├── lib/
│   │   ├── auth.ts            # Configuration NextAuth
│   │   ├── bingo.ts           # Logique de détection bingo
│   │   ├── prisma.ts          # Client Prisma singleton
│   │   └── socket.ts          # Client Socket.io
│   └── types/
│       └── index.ts           # Types TypeScript partagés
├── .env.example               # Template des variables d'environnement
├── docker-compose.yml         # Orchestration des containers
├── Dockerfile                 # Image de l'application
├── next.config.js             # Configuration Next.js + security headers
├── server.js                  # Serveur custom Node.js (Next.js + Socket.io)
└── tailwind.config.ts
```

---

## Développement local

### Prérequis

- Node.js 24 (voir `.nvmrc` ; `engines` : `>=24 <25`)
- Docker + Docker Compose
- `npm`

### Installation

```bash
# 1. Cloner le projet
git clone <repo> markit && cd markit

# 2. Installer les dépendances
npm install

# 3. Copier et configurer les variables d'environnement
cp .env.example .env
```

Éditer `.env` (les valeurs par défaut fonctionnent en dev) :

```env
DATABASE_URL="postgresql://markit:markit_password@localhost:5432/markit"
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="<générer avec : openssl rand -base64 32>"
```

```bash
# 4. Démarrer la base de données PostgreSQL
docker compose up postgres -d

# 5. Créer les tables
npm run db:push

# 6. Charger les 35 phrases par défaut
npm run db:seed

# 7. Lancer le serveur de développement
npm run dev
```

L'application est disponible sur **<http://localhost:3000>**.

Avant de pousser, lancer les contrôles locaux :

```bash
npm run ci        # Node, NEXTAUTH_SECRET, Prisma generate, lint, markdownlint, typecheck
npm run ci:full   # idem + audit npm (niveau high+, sans deps de dev)
```

Husky exécute `npm run ci` au `pre-push` et [commitlint](https://commitlint.js.org/) au `commit-msg` (Conventional Commits).

---

## CI / CD GitHub

Le workflow [`.github/workflows/ci.yml`](.github/workflows/ci.yml) tourne sur chaque push et pull request vers `main` (les changements sous `.cursor/` sont ignorés).

| Job | Déclencheur | Rôle |
| --- | --- | --- |
| `quality` | push / PR sur `main` | `npm ci` puis `npm run ci:full` |
| `docker` | PR sur `main` uniquement | build Docker (validation, **sans** push d'image) |
| `release` | push sur `main` (après `quality`) | semantic-release, puis push image GHCR si une version est publiée |

### Contrôles `quality`

`npm run ci:full` enchaîne :

1. Vérification de la version Node.js
2. Présence / format de `NEXTAUTH_SECRET`
3. `prisma generate`
4. ESLint (`npm run lint`)
5. Markdownlint (`npm run lint:md`)
6. TypeScript (`npm run typecheck`)
7. Audit npm (`npm run audit:ci`, sévérité ≥ high, deps de prod uniquement)

En local, `npm run ci` saute l'audit réseau ; `npm run ci:full` le réactive (comme en CI).

### Job `docker` (PR)

Sur une pull request, le Dockerfile est construit avec Buildx pour valider l'image. Rien n'est poussé sur GHCR à cette étape (le push productif reste dans `release`). Le cache de build est partagé via GHCR (`buildcache`) et le cache GitHub Actions.

### Releases (semantic-release)

Config : [`release.config.cjs`](release.config.cjs). Sur chaque push réussi sur `main`, semantic-release calcule la version à partir des [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `chore:`, …) et peut publier :

- un tag Git `vX.Y.Z`
- une GitHub Release
- la mise à jour de `CHANGELOG.md`, `package.json` et `package-lock.json`
- un commit `chore(release): … [skip ci]`

Ensuite, si une release a bien été publiée, l'image Docker est poussée sur `ghcr.io/<org>/markit` avec les tags `vX.Y.Z`, `X.Y` et `latest` (ce dernier uniquement pour une version stable, pas une pre-release).

### Secrets et permissions

**Secrets** (Settings → Secrets and variables → Actions) :

- `RELEASE_APP_ID` — ID de la GitHub App utilisée pour publier les releases
- `RELEASE_APP_PRIVATE_KEY` — clé privée de cette App

La GitHub App pousse les commits / tags de release (utile avec une protection de branche). Les images GHCR utilisent `GITHUB_TOKEN` (permissions `packages: write` sur les jobs `docker` et `release`).

Vérifier aussi **Settings → Actions → General → Workflow permissions** → *Read and write permissions* si besoin pour GHCR.

### Dependabot

[`.github/dependabot.yml`](.github/dependabot.yml) ouvre des PRs chaque lundi pour :

| Écosystème | Cible | Groupes / ignore |
| --- | --- | --- |
| `npm` | `package.json` / lockfile | groupes `next`, `prisma`, `dev-tools` ; majeures `@types/node` et `typescript` ignorées |
| `github-actions` | pins SHA des workflows | — |
| `docker` | `Dockerfile` (y compris digests) | majeures de l'image `node` ignorées |

Les commits / titres de PR suivent `chore(deps): …` (pas de bump de version semantic-release).

**À activer sur GitHub** (Settings → Advanced Security, ou onglet Security) :

1. Dependency graph
2. Dependabot alerts
3. Dependabot security updates
4. Dependabot version updates (détecte `dependabot.yml` sur `main`)

Puis **Settings → Actions → General** : *Allow GitHub Actions to create and approve pull requests* si tu veux que Dependabot puisse relancer la CI / rebaser proprement.

### Workflow recommandé

```bash
npm run ci
git checkout -b feat/ma-feature
git add .
git commit -m "feat: description courte"
git push -u origin feat/ma-feature
```

Ouvrir une PR vers `main`, puis merger (idéalement en squash-merge avec un titre conventional). semantic-release s'exécute sur le push résultant vers `main`.

---

## Déploiement en production

### Prérequis serveur

- Docker + Docker Compose
- Apache 2.4 avec les modules : `proxy`, `proxy_http`, `proxy_wstunnel`, `rewrite`, `headers`, `ssl`
- Un nom de domaine pointant sur le serveur
- Certbot (Let's Encrypt) pour le certificat SSL

### Étape 1 — Préparer les fichiers

```bash
git clone <repo> /opt/markit && cd /opt/markit
cp .env.example .env
```

### Étape 2 — Configurer les variables d'environnement

```bash
# Générer les secrets
openssl rand -base64 32   # → POSTGRES_DB_PASSWORD
openssl rand -base64 32   # → NEXTAUTH_SECRET
```

Éditer `/opt/markit/.env` :

```env
POSTGRES_USER=markit
POSTGRES_DB=markit
POSTGRES_DB_PASSWORD=<secret généré>

NEXTAUTH_URL=https://markit.example.com
NEXTAUTH_SECRET=<secret généré>
```

### Étape 3 — Construire et démarrer les containers

```bash
docker compose up -d --build
```

Les containers démarrent, les migrations sont appliquées automatiquement et les phrases par défaut sont chargées.

Vérifier que tout tourne :

```bash
docker compose ps
docker compose logs -f app
```

### Étape 4 — Configurer Apache

Activer les modules nécessaires :

```bash
a2enmod proxy proxy_http proxy_wstunnel rewrite headers ssl
```

Obtenir le certificat SSL :

```bash
certbot certonly --standalone -d markit.example.com
```

Copier et activer la configuration Apache :

```bash
# Adapter le ServerName dans le fichier
cp /opt/markit/apache/markit.conf /etc/apache2/sites-available/markit.conf
# Remplacer markit.example.com par ton domaine réel
nano /etc/apache2/sites-available/markit.conf

a2ensite markit.conf
apache2ctl configtest     # Vérifier la syntaxe
systemctl reload apache2
```

Le site est maintenant accessible sur **<https://markit.example.com>**.

### Étape 5 — Renouvellement automatique SSL

Certbot installe un cron automatique. Vérifier avec :

```bash
certbot renew --dry-run
```

---

## Configuration Apache

Le fichier `apache/markit.conf` configure :

| Fonctionnalité | Détail |
| --- | --- |
| Redirect HTTP→HTTPS | `RewriteRule` permanent (301) |
| SSL/TLS | TLS 1.2 et 1.3 uniquement, ciphers modernes |
| HSTS | `max-age=63072000; includeSubDomains; preload` (2 ans) |
| Proxy HTTP | `ProxyPass` vers `127.0.0.1:3000` |
| Proxy WebSocket | `RewriteRule` vers `ws://127.0.0.1:3000` pour Socket.io |
| En-têtes sécurité | `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy` |
| Headers forwarded | `X-Forwarded-Proto: https` transmis à Next.js |

> **Important** : remplacer `markit.example.com` par ton domaine réel dans le fichier.

---

## Variables d'environnement

| Variable | Obligatoire | Description |
| --- | --- | --- |
| `POSTGRES_USER` | production | Utilisateur PostgreSQL (défaut : `markit`) |
| `POSTGRES_DB` | production | Nom de la base (défaut : `markit`) |
| `POSTGRES_DB_PASSWORD` | **oui** | Mot de passe PostgreSQL |
| `DATABASE_URL` | dev local | URL complète (remplace les 3 variables Postgres) |
| `NEXTAUTH_URL` | **oui** | URL publique du site (`https://...` en prod) |
| `NEXTAUTH_SECRET` | **oui** | Clé de signature JWT — générer avec `openssl rand -base64 32` |

---

## Base de données

### Schéma

```text
User          → compte utilisateur
Team          → équipe avec code d'invitation
TeamMember    → appartenance utilisateur↔équipe (rôle : OWNER/ADMIN/MEMBER)
Phrase        → phrase de la banque (isDefault=true pour les phrases communes)
BingoCard     → grille de bingo (rows × cols, freeCenter)
Cell          → case de la grille (phrase + position)
CheckedCell   → case cochée (par quel utilisateur, quand)
```

### Commandes

```bash
npm run db:push       # Synchroniser le schéma (dev)
npm run db:migrate    # Créer une migration (dev)
npm run db:seed       # Charger les phrases par défaut
npm run db:studio     # Ouvrir Prisma Studio (interface graphique BDD)
npm run db:generate   # Regénérer le client Prisma
```

### Sauvegarde

```bash
# Dump
docker exec markit_db pg_dump -U markit markit > backup_$(date +%Y%m%d).sql

# Restauration
docker exec -i markit_db psql -U markit markit < backup_20260101.sql
```

---

## Sécurité

### Ce qui est en place

| Mesure | Implémentation | Détail |
| --- | --- | --- |
| HTTPS forcé | Redirect Apache 301 + HSTS | 2 ans, includeSubDomains, preload |
| Cookies sécurisés | `Secure` + `HttpOnly` auto si HTTPS | Via `useSecureCookies` NextAuth |
| Mots de passe | **bcrypt** (coût 12) | ~300ms/tentative, résistant aux rainbow tables |
| Sessions JWT | Signées `NEXTAUTH_SECRET`, 7 jours | Token invalidé si le secret change |
| Autorisation API | Vérification d'appartenance à l'équipe | Protection contre les attaques IDOR |
| Authentification Socket.io | JWT NextAuth vérifié côté serveur | Le `userName` est résolu serveur, non falsifiable |
| CORS Socket.io | Restreint au domaine `NEXTAUTH_URL` en prod | `*` seulement en dev |
| CSP | Séparée dev/prod, sans `unsafe-eval` en prod | Protège contre XSS |
| X-Frame-Options | `SAMEORIGIN` | Anti-clickjacking |
| X-Content-Type-Options | `nosniff` | Anti-MIME sniffing |
| X-Forwarded-For | Écrasé par Apache | Empêche la falsification d'IP côté client |
| Taille des requêtes | `LimitRequestBody 1MB` Apache | Protège contre les DoS simples |
| Longueurs de champ | Vérifiées côté serveur sur toutes les API | Empêche les payloads surdimensionnés |
| Ports isolés | App sur `127.0.0.1`, BDD sans port public | Inatteignables depuis Internet |
| En-têtes serveur | `X-Powered-By` et `Server` supprimés | Ne révèle pas la stack |
| TLS | TLS 1.2/1.3 uniquement, ciphers AEAD | SSLv3/TLS 1.0/1.1 désactivés |

### Ce qui reste à ta charge

- **Rate limiting sur l'authentification** — implémenter avec Fail2ban ou `mod_ratelimit` Apache sur `/api/auth/signin` et `/api/auth/register` pour limiter les tentatives de brute force.

  Exemple Fail2ban (`/etc/fail2ban/filter.d/markit-auth.conf`) :

  ```ini
  [Definition]
  failregex = ^<HOST> .* "POST /api/auth/callback/credentials HTTP.*" 401
  ignoreregex =
  ```

- **Soumission HSTS preload** — le header `preload` est positionné mais la soumission au registre <https://hstspreload.org/> doit être faite manuellement après vérification que le domaine est stable.

- **Mises à jour régulières** :

  ```bash
  docker compose pull && docker compose up -d --build
  npm audit fix
  ```

- **Monitoring des logs** — surveiller `markit_error.log` et les logs Docker pour détecter des comportements anormaux.

---

## Commandes utiles

```bash
# ── Développement ─────────────────────────────────────────────
npm run dev              # Serveur de développement (port 3000)
npm run build            # Build de production
npm run lint             # Linter ESLint
npm run lint:md          # Markdownlint
npm run typecheck        # Vérification TypeScript
npm run ci               # Contrôles locaux (sans audit réseau)
npm run ci:full          # Contrôles CI complets (+ audit npm)
npm run release          # semantic-release (utilisé par le job CI)

# ── Base de données ────────────────────────────────────────────
npm run db:push          # Synchroniser schéma (dev, sans migration)
npm run db:migrate       # Créer + appliquer une migration
npm run db:seed          # Charger les phrases par défaut
npm run db:studio        # Interface graphique Prisma Studio

# ── Docker ─────────────────────────────────────────────────────
docker compose up -d              # Démarrer tous les services
docker compose up -d --build      # Rebuild + démarrer
docker compose down               # Arrêter les services
docker compose logs -f app        # Logs de l'application
docker compose logs -f postgres   # Logs de la base de données
docker compose restart app        # Redémarrer l'application

# ── Sauvegarde BDD ─────────────────────────────────────────────
docker exec markit_db pg_dump -U markit markit > backup.sql
docker exec -i markit_db psql -U markit markit < backup.sql
```
