#!/bin/sh
set -eu

echo "[markit] Démarrage…"

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
