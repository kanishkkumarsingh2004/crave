#!/bin/sh
set -e

# ==============================================================================
# crave. Container Runtime Entrypoint
# ==============================================================================

# 1. Automatic Database Migrations (Optional via AUTO_MIGRATE=true)
if [ "$AUTO_MIGRATE" = "true" ] || [ "$AUTO_MIGRATE" = "1" ]; then
  echo "[crave-entrypoint] AUTO_MIGRATE is enabled. Running Prisma database migrations..."
  npx prisma migrate deploy || {
    echo "[crave-entrypoint] FATAL: Database migration failed. Aborting startup."
    exit 1
  }
  echo "[crave-entrypoint] Database migrations applied successfully."
fi

# 2. Execute target command (preserves signals for graceful shutdown)
exec "$@"
