#!/bin/sh
set -euo pipefail

echo "[entrypoint] Waiting for MongoDB at ${MONGODB_URI}..."
until node --input-type=module -e "
  import mongoose from 'mongoose';
  const ok = await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 1500 }).then(() => true).catch(() => false);
  process.exit(ok ? 0 : 1);
" >/dev/null 2>&1; do
  sleep 2
done
echo "[entrypoint] MongoDB is reachable."

echo "[entrypoint] Checking whether the demo data already exists..."
node /app/docker/seed-if-empty.js
case "$?" in
  2)
    echo "[entrypoint] No admin found — seeding the demo catalogue."
    node /app/server/src/scripts/seed.js
    ;;
  *)
    echo "[entrypoint] Demo data already present — skipping seed."
    ;;
esac

echo "[entrypoint] Starting the Tile Visualizer API..."
exec node /app/server/src/server.js