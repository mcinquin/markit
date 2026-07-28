#!/bin/sh
set -eu

echo "[markit] Démarrage…"

# DATABASE_URL peut être fournie telle quelle ; sinon on la construit avec encodage URL
# (obligatoire si le mot de passe contient +, /, =, @, :, etc. — ex. openssl rand -base64 32).
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -z "${POSTGRES_DB_PASSWORD:-}" ]; then
    echo "[markit] ERREUR: POSTGRES_DB_PASSWORD ou DATABASE_URL requis" >&2
    exit 1
  fi

  export DATABASE_URL="$(
    node -e "
      const user = process.env.POSTGRES_USER || 'markit';
      const pass = process.env.POSTGRES_DB_PASSWORD || '';
      const db = process.env.POSTGRES_DB || 'markit';
      const host = process.env.POSTGRES_HOST || 'postgres';
      const port = process.env.POSTGRES_PORT || '5432';
      const url = 'postgresql://'
        + encodeURIComponent(user) + ':'
        + encodeURIComponent(pass) + '@'
        + host + ':' + port + '/'
        + encodeURIComponent(db);
      process.stdout.write(url);
    "
  )"
fi

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null || true)" ]; then
  echo "[markit] Application des migrations Prisma…"
  ./node_modules/.bin/prisma migrate deploy
else
  echo "[markit] Pas de migrations — synchronisation du schéma (db push)…"
  ./node_modules/.bin/prisma db push --skip-generate
fi

echo "[markit] Seed (phrases + admin si configuré)…"
./node_modules/.bin/prisma db seed || echo "[markit] Seed ignoré ou déjà appliqué"

echo "[markit] Lancement du serveur…"
exec node server.js
