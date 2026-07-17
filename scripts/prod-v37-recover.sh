#!/usr/bin/env bash
# =============================================================================
# WhatsWay v3.6 -> v3.7 one-shot production recovery
# =============================================================================
# Run this on the production server (e.g. /home/whatsway).
# Idempotent: safe to re-run if any step fails.
#
# Steps:
#   1. Backup the database
#   2. Run the cleanup SQL (users, contacts, templates, automation_edges)
#   3. Push the v3.7 schema (npm run db:push --force)
#   4. Restart pm2
#   5. Verify the running version
#
# Usage:
#   cd /home/whatsway
#   bash scripts/prod-v37-recover.sh
# =============================================================================

set -u
set -o pipefail

APP_DIR="${APP_DIR:-$(pwd)}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="${SCRIPT_DIR}/prod-v37-precheck-and-cleanup.sql"
BACKUP_FILE="/tmp/whatsway-backup-pre-v37-$(date +%Y%m%d-%H%M%S).sql"
PM2_NAME="${PM2_NAME:-whatsway}"

RED=$'\033[0;31m'
GRN=$'\033[0;32m'
YLW=$'\033[0;33m'
RST=$'\033[0m'

step() { echo; echo "${YLW}==> $*${RST}"; }
pass() { echo "${GRN}[PASS]${RST} $*"; }
fail() { echo "${RED}[FAIL]${RST} $*" >&2; exit 1; }

# ---------------------------------------------------------------------------
# Locate DATABASE_URL
# ---------------------------------------------------------------------------
if [ -z "${DATABASE_URL:-}" ]; then
  if [ -f "${APP_DIR}/.env" ]; then
    # shellcheck disable=SC1091
    set -a; . "${APP_DIR}/.env"; set +a
  fi
fi
[ -n "${DATABASE_URL:-}" ] || fail "DATABASE_URL not set and not found in ${APP_DIR}/.env"
[ -f "${SQL_FILE}" ] || fail "Cleanup SQL not found at ${SQL_FILE}"

# ---------------------------------------------------------------------------
# 1. Backup
# ---------------------------------------------------------------------------
step "1/5 Backing up database to ${BACKUP_FILE}"
pg_dump "${DATABASE_URL}" > "${BACKUP_FILE}" || fail "pg_dump failed"
SIZE=$(stat -c%s "${BACKUP_FILE}" 2>/dev/null || stat -f%z "${BACKUP_FILE}")
[ "${SIZE}" -gt 0 ] || fail "Backup file is empty"
pass "Backup written ($(du -h "${BACKUP_FILE}" | cut -f1))"

# ---------------------------------------------------------------------------
# 2. Cleanup SQL
# ---------------------------------------------------------------------------
step "2/5 Running cleanup SQL"
psql "${DATABASE_URL}" -v ON_ERROR_STOP=1 -f "${SQL_FILE}" \
  || fail "Cleanup SQL failed. DB rolled back. Review output above."
pass "Cleanup SQL completed"

# ---------------------------------------------------------------------------
# 3. Schema push
# ---------------------------------------------------------------------------
step "3/5 Pushing v3.7 schema (npm run db:push --force)"
cd "${APP_DIR}" || fail "Cannot cd to ${APP_DIR}"
npm run db:push -- --force 2>&1 | tee /tmp/db-push-v37.log
PUSH_RC=${PIPESTATUS[0]}
if [ "${PUSH_RC}" -ne 0 ]; then
  fail "Schema push failed (exit ${PUSH_RC}). See /tmp/db-push-v37.log. Restore: psql \"\$DATABASE_URL\" < ${BACKUP_FILE}"
fi
pass "Schema push completed"

# ---------------------------------------------------------------------------
# 4. pm2 restart
# ---------------------------------------------------------------------------
step "4/5 Restarting pm2 process '${PM2_NAME}'"
pm2 restart "${PM2_NAME}" || fail "pm2 restart failed"
pass "pm2 restarted"

# ---------------------------------------------------------------------------
# 5. Verify
# ---------------------------------------------------------------------------
step "5/5 Verifying running version"
sleep 3
APP_VERSION=$(node -p "require('${APP_DIR}/package.json').version" 2>/dev/null || echo "unknown")
echo "package.json version: ${APP_VERSION}"
pm2 ls

# Confirm pm2 actually has the app online and serving the new version.
PM2_STATUS=$(pm2 jlist 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{const a=JSON.parse(d);const p=a.find(x=>x.name==='${PM2_NAME}');console.log(p?p.pm2_env.status:'missing');}catch(e){console.log('parse-error');}})" \
  2>/dev/null || echo "unknown")
[ "${PM2_STATUS}" = "online" ] || fail "pm2 process '${PM2_NAME}' is not online (status: ${PM2_STATUS})"

# Hit the local app and confirm currentVersion matches package.json.
RUNTIME_VERSION=$(curl -fsS --max-time 5 http://127.0.0.1:3000/api/app-update/status 2>/dev/null \
  | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>{try{console.log(JSON.parse(d).currentVersion||'unknown');}catch(e){console.log('parse-error');}})" \
  2>/dev/null || echo "unreachable")
echo "runtime version: ${RUNTIME_VERSION}"

case "${APP_VERSION}" in
  3.7.*) pass "package.json reports v${APP_VERSION}" ;;
  *)     fail "Expected package.json v3.7.x, got v${APP_VERSION}" ;;
esac
case "${RUNTIME_VERSION}" in
  3.7.*) pass "Running app reports v${RUNTIME_VERSION}" ;;
  unreachable|parse-error|unknown)
    echo "${YLW}[WARN]${RST} Could not reach app on 127.0.0.1:3000 to confirm runtime version. Verify manually in the browser." ;;
  *)     fail "Running app reports v${RUNTIME_VERSION}, expected v3.7.x" ;;
esac

echo
echo "${GRN}=============================================================================${RST}"
echo "${GRN}RECOVERY COMPLETE${RST}"
echo "  Backup kept at: ${BACKUP_FILE}"
echo "  Visit https://whatsway.diploy.in/app-update to confirm:"
echo "    - Header badge reads v3.7"
echo "    - Upload ZIP dropzone is visible above the Update complete panel"
echo "    - Hard refresh shows one settled line per pipeline step"
echo "${GRN}=============================================================================${RST}"
