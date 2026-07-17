#!/bin/bash
set -e

echo "╔════════════════════════════════════════════════════════════╗"
echo "║     🚀 WhatsWay Production Deployment                      ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

TOTAL_RAM=$(free -m | awk '/^Mem:/{print $2}')
echo "📊 Server RAM: ${TOTAL_RAM}MB"

if [ "$TOTAL_RAM" -lt 2048 ]; then
    echo "⚠️  Low memory detected (${TOTAL_RAM}MB). Checking swap..."
    SWAP_SIZE=$(free -m | awk '/^Swap:/{print $2}')
    if [ "$SWAP_SIZE" -lt 1024 ]; then
        echo "📦 Creating 2GB swap file for build process..."
        if [ ! -f /swapfile ]; then
            sudo fallocate -l 2G /swapfile
            sudo chmod 600 /swapfile
            sudo mkswap /swapfile
            sudo swapon /swapfile
            echo "   ✅ Swap enabled (2GB)"
        else
            if ! swapon --show | grep -q "/swapfile"; then
                sudo swapon /swapfile
                echo "   ✅ Existing swap file activated"
            else
                echo "   ✅ Swap already active"
            fi
        fi
    else
        echo "   ✅ Sufficient swap available (${SWAP_SIZE}MB)"
    fi
fi

echo ""
echo "📦 Code already synced from GitHub Actions — skipping git pull."

echo ""
echo "📦 Installing dependencies..."
npm install --production=false

echo ""
echo "🔧 Building application..."
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo ""
echo "🧹 Pre-flight: cleaning legacy data that would block schema sync..."
CLEANUP_SQL="$SCRIPT_DIR/scripts/prod-v37-precheck-and-cleanup.sql"
if ! command -v psql >/dev/null 2>&1; then
    echo "   ⚠️  psql not found on PATH — skipping automated cleanup."
    echo "      If 'db:push' fails on legacy constraint violations, run the"
    echo "      script manually from another box: $CLEANUP_SQL"
elif [ -z "${DATABASE_URL:-}" ]; then
    echo "   ⚠️  DATABASE_URL not set — skipping automated cleanup."
elif [ ! -f "$CLEANUP_SQL" ]; then
    echo "   ⚠️  Cleanup script missing at $CLEANUP_SQL — skipping."
else
    if psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$CLEANUP_SQL"; then
        echo "   ✅ Legacy data cleanup complete (idempotent)."
    else
        echo "   ❌ Cleanup script failed. Aborting deploy — data needs manual review."
        exit 1
    fi
fi

echo ""
echo "🗄️  Syncing database schema..."
npm run db:push --force
echo "   ✅ Database schema synced"

echo ""
echo "🚀 Restarting application with PM2..."
if pm2 describe whatsway > /dev/null 2>&1; then
    pm2 restart whatsway
    echo "   ✅ PM2 process restarted"
else
    pm2 start ecosystem.config.cjs
    echo "   ✅ PM2 process started"
fi

pm2 save

echo ""
echo "🔎 Verifying deployment (version + pm2 health)..."
EXPECTED_VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "")
if [ -n "$EXPECTED_VERSION" ]; then
    if [ -f "$SCRIPT_DIR/VERSION" ]; then
        VERSION_FILE_CONTENT=$(tr -d '[:space:]' < "$SCRIPT_DIR/VERSION")
        if [ "$VERSION_FILE_CONTENT" != "$EXPECTED_VERSION" ]; then
            echo "   ❌ VERSION file ($VERSION_FILE_CONTENT) does not match package.json ($EXPECTED_VERSION)."
            echo "      getAppVersion() prefers VERSION over package.json — fix the bump and redeploy."
            exit 1
        fi
    fi
    echo "   ✅ On-disk version is v${EXPECTED_VERSION}."
fi

# Confirm pm2 actually restarted (process online + uptime recent).
sleep 5
PM2_JSON=$(pm2 jlist 2>/dev/null || echo "[]")
PM2_STATUS=$(echo "$PM2_JSON" | node -e "
  let raw = ''; process.stdin.on('data', c => raw += c);
  process.stdin.on('end', () => {
    try {
      const list = JSON.parse(raw);
      const proc = list.find(p => p.name === 'whatsway');
      if (!proc) { console.log('missing'); return; }
      const status = proc.pm2_env && proc.pm2_env.status;
      const uptime = proc.pm2_env && proc.pm2_env.pm_uptime
        ? Date.now() - proc.pm2_env.pm_uptime : -1;
      console.log(JSON.stringify({ status, uptime_ms: uptime }));
    } catch (e) { console.log('parse_error'); }
  });
" 2>/dev/null || echo "node_error")

case "$PM2_STATUS" in
    missing)
        echo "   ❌ pm2 has no 'whatsway' process. Restart did not take effect."
        exit 1
        ;;
    parse_error|node_error|"")
        echo "   ⚠️  Could not parse pm2 jlist output — skipping pm2 health check."
        ;;
    *)
        PROC_STATUS=$(echo "$PM2_STATUS" | sed -n 's/.*"status":"\([^"]*\)".*/\1/p')
        UPTIME_MS=$(echo "$PM2_STATUS" | sed -n 's/.*"uptime_ms":\(-\?[0-9]*\).*/\1/p')
        if [ "$PROC_STATUS" != "online" ]; then
            echo "   ❌ pm2 process status is '$PROC_STATUS' (expected 'online'). Check 'pm2 logs whatsway'."
            exit 1
        fi
        if [ -n "$UPTIME_MS" ] && [ "$UPTIME_MS" -gt 120000 ] 2>/dev/null; then
            echo "   ⚠️  pm2 process uptime is ${UPTIME_MS}ms — restart may not have taken effect."
        else
            echo "   ✅ pm2 'whatsway' is online (uptime ${UPTIME_MS}ms)."
        fi
        ;;
esac

# HTTP version probe against /api/app-update/status. Note: this endpoint
# requires superadmin auth, so unauthenticated calls from CI typically
# return 401/HTML and `curl -fsS` fails — we warn and continue (per spec)
# rather than fail the deploy. If the response IS parseable and the version
# differs from package.json, we hard-fail (catches stale-runtime deploys).
if [ -n "$EXPECTED_VERSION" ]; then
    STATUS_URL="http://127.0.0.1:${PORT:-5000}/api/app-update/status"
    sleep 5
    HTTP_RESP=$(curl -fsS --max-time 5 "$STATUS_URL" 2>/dev/null || true)
    if [ -z "$HTTP_RESP" ]; then
        echo "   ⚠️  Could not reach $STATUS_URL (likely auth-protected or app warming up) — skipping HTTP version check."
    else
        HTTP_VERSION=$(echo "$HTTP_RESP" | sed -n 's/.*"currentVersion"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p')
        if [ -z "$HTTP_VERSION" ]; then
            echo "   ⚠️  Status endpoint did not return a parseable currentVersion — skipping HTTP version check."
        elif [ "$HTTP_VERSION" = "$EXPECTED_VERSION" ]; then
            echo "   ✅ Status endpoint reports v${HTTP_VERSION} (matches package.json)."
        else
            echo "   ❌ STALE RUNTIME: status endpoint reports v${HTTP_VERSION}, expected v${EXPECTED_VERSION}."
            echo "      pm2 may be serving cached code. Try: pm2 delete whatsway && pm2 start ecosystem.config.cjs"
            exit 1
        fi
    fi
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     ✅ Deployment completed successfully!                   ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Useful commands:"
echo "  pm2 logs whatsway    — View application logs"
echo "  pm2 status           — Check process status"
echo "  pm2 restart whatsway — Restart application"
echo ""

exit 0
