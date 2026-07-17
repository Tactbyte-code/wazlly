#!/usr/bin/env bash
# ============================================================
# Build a clean production update ZIP for the App Update
# upload screen. The output ZIP contains only the source code
# required to run the app — no Replit files, no agent state,
# no node_modules, no symlinks, no .env secrets.
#
# Approach: explicit ALLOWLIST of top-level directories and
# files (anything not on the list is never staged). Inside
# allowed directories, defensive nested excludes still strip
# common cruft (node_modules, dist, .env*, *.log, etc.).
#
# Usage:  bash scripts/build-prod-zip.sh
#         npm run build:prod-zip
#
# Output: dist-release/whatsway-<VERSION>-prod.zip
# ============================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

# --- Resolve version ---
if [[ -f VERSION ]]; then
  VERSION="$(tr -d '[:space:]' < VERSION)"
elif [[ -f package.json ]]; then
  VERSION="$(node -p "require('./package.json').version")"
else
  echo "Error: cannot resolve version (no VERSION or package.json)." >&2
  exit 1
fi

if [[ -z "${VERSION:-}" ]]; then
  echo "Error: empty version string." >&2
  exit 1
fi

# --- Required tools ---
for cmd in tar zip find node; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "Error: required tool '$cmd' not found in PATH." >&2
    exit 1
  fi
done

OUT_DIR="dist-release"
STAGE_DIR="${OUT_DIR}/staging"
ZIP_NAME="whatsway-${VERSION}-prod.zip"
ZIP_PATH="${OUT_DIR}/${ZIP_NAME}"

echo "▶ Packaging WhatsWay v${VERSION}"
rm -rf "$OUT_DIR"
mkdir -p "$STAGE_DIR"

# --- ALLOWLIST: only these top-level paths are staged ---
ALLOW_DIRS=(client server shared packages public docs scripts)

ALLOW_FILES=(
  package.json
  package-lock.json
  VERSION
  tsconfig.json
  vite.config.ts
  vitest.config.ts
  tailwind.config.ts
  postcss.config.js
  drizzle.config.ts
  ecosystem.config.cjs
  nginx.conf.example
  .env.example
  deploy.sh
  documentation.html
  update-guide.html
)

# --- Defensive nested excludes (apply when copying allowed dirs) ---
# Excludes every .env* file (the only env file copied into the
# release is the explicit top-level .env.example via ALLOW_FILES).
NESTED_EXCLUDES=(
  --exclude=node_modules
  --exclude=dist
  --exclude=build
  --exclude=uploads
  --exclude=.DS_Store
  --exclude='*.log'
  --exclude='.env'
  --exclude='.env.*'
)

echo "▶ Staging files into $STAGE_DIR …"

# Copy allowed top-level files (skip silently if a file is missing).
for f in "${ALLOW_FILES[@]}"; do
  if [[ -e "$f" ]]; then
    # -h dereferences symlinks to plain files (defensive).
    tar -cf - -h "$f" | tar -xf - -C "$STAGE_DIR"
  fi
done

# Copy allowed top-level directories with nested excludes.
for d in "${ALLOW_DIRS[@]}"; do
  if [[ -d "$d" ]]; then
    tar -cf - "${NESTED_EXCLUDES[@]}" -h "$d" \
      | tar -xf - -C "$STAGE_DIR"
  fi
done

# --- Sanity verifications (fail loudly) ---
echo "▶ Verifying staged tree …"

SYMLINKS="$(find "$STAGE_DIR" -type l 2>/dev/null || true)"
if [[ -n "$SYMLINKS" ]]; then
  echo "Error: staged tree still contains symlinks:" >&2
  echo "$SYMLINKS" >&2
  exit 1
fi

REPLIT_HITS="$(find "$STAGE_DIR" -iname '*replit*' 2>/dev/null || true)"
if [[ -n "$REPLIT_HITS" ]]; then
  echo "Error: staged tree still contains 'replit'-named entries:" >&2
  echo "$REPLIT_HITS" >&2
  exit 1
fi

# Reject any .env* file other than .env.example (defense in depth
# in case the nested excludes ever drift).
LEAKED_ENV="$(find "$STAGE_DIR" -name '.env*' ! -name '.env.example' 2>/dev/null || true)"
if [[ -n "$LEAKED_ENV" ]]; then
  echo "Error: staged tree contains non-example .env files:" >&2
  echo "$LEAKED_ENV" >&2
  exit 1
fi

LEAKED_UPLOADS="$(find "$STAGE_DIR" -type d -name 'uploads' 2>/dev/null || true)"
if [[ -n "$LEAKED_UPLOADS" ]]; then
  echo "Error: staged tree contains an 'uploads' directory:" >&2
  echo "$LEAKED_UPLOADS" >&2
  exit 1
fi

for required in package.json server client VERSION; do
  if [[ ! -e "$STAGE_DIR/$required" ]]; then
    echo "Error: staged tree is missing required entry: $required" >&2
    exit 1
  fi
done

# --- Zip it (flat archive — no extra wrapping folder) ---
echo "▶ Creating $ZIP_PATH …"
( cd "$STAGE_DIR" && zip -qr "../${ZIP_NAME}" . )

# --- Summary ---
FILE_COUNT="$(find "$STAGE_DIR" -type f | wc -l | tr -d ' ')"
ZIP_SIZE="$(du -h "$ZIP_PATH" | cut -f1)"

echo ""
echo "✔ Built $ZIP_PATH"
echo "  Version : $VERSION"
echo "  Size    : $ZIP_SIZE"
echo "  Files   : $FILE_COUNT"
echo ""
echo "Upload via Superadmin → Application Update."
