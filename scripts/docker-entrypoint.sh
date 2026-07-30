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

baseline_and_sync() {
  echo "[markit] BDD déjà peuplée sans historique Prisma (P3005) — baseline…"
  echo "[markit] Les migrations existantes sont marquées comme appliquées, puis le schéma est synchronisé."
  for migration_dir in prisma/migrations/*/ ; do
    [ -d "$migration_dir" ] || continue
    migration_name=$(basename "$migration_dir")
    echo "[markit]   resolve --applied ${migration_name}"
    ./node_modules/.bin/prisma migrate resolve --applied "$migration_name" || true
  done
  echo "[markit] Synchronisation du schéma (db push)…"
  ./node_modules/.bin/prisma db push --skip-generate
}

apply_migrations() {
  migrate_log=$(mktemp)
  set +e
  ./node_modules/.bin/prisma migrate deploy >"$migrate_log" 2>&1
  status=$?
  set -e
  cat "$migrate_log"
  if [ "$status" -eq 0 ]; then
    rm -f "$migrate_log"
    return 0
  fi
  if grep -q "P3005" "$migrate_log"; then
    rm -f "$migrate_log"
    baseline_and_sync
    return 0
  fi
  rm -f "$migrate_log"
  echo "[markit] ERREUR: prisma migrate deploy a échoué" >&2
  exit "$status"
}

if [ -d prisma/migrations ] && [ -n "$(ls -A prisma/migrations 2>/dev/null || true)" ]; then
  echo "[markit] Application des migrations Prisma…"
  apply_migrations
else
  echo "[markit] Pas de migrations — synchronisation du schéma (db push)…"
  ./node_modules/.bin/prisma db push --skip-generate
fi

echo "[markit] Seed (phrases + admin si configuré)…"
if ! ./node_modules/.bin/prisma db seed; then
  echo "[markit] ERREUR: le seed a échoué (vérifiez ADMIN_EMAIL / ADMIN_PASSWORD)" >&2
  exit 1
fi

echo "[markit] Lancement du serveur…"
exec node server.js
