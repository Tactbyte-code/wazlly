#!/bin/bash
set -e

npm install --no-audit --no-fund

if [ -n "$DATABASE_URL" ]; then
  npm run db:push -- --force
fi
