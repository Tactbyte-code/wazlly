#!/usr/bin/env bash
# ============================================================
# Bump the application version across:
#   - VERSION
#   - package.json (root "version")
#   - package-lock.json (root "version" + packages[""].version)
#
# Usage:  bash scripts/bump-version.sh <new-version>
#         npm run version:set -- <new-version>
#
# Only the ROOT version fields are touched. Dependency version
# strings (e.g. jszip "^3.7.1") are left untouched.
# ============================================================
set -euo pipefail

if [[ $# -ne 1 || -z "${1:-}" ]]; then
  echo "Usage: bash scripts/bump-version.sh <new-version>" >&2
  echo "Example: bash scripts/bump-version.sh 3.7.3" >&2
  exit 2
fi

NEW="$1"

if ! [[ "$NEW" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.-]+)?$ ]]; then
  echo "Error: '$NEW' is not a valid version (expected MAJOR.MINOR.PATCH[-prerelease])." >&2
  exit 2
fi

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR"

if [[ ! -f VERSION ]]; then
  echo "Error: VERSION file not found in $ROOT_DIR" >&2
  exit 1
fi

OLD="$(tr -d '[:space:]' < VERSION)"

if [[ "$OLD" == "$NEW" ]]; then
  echo "Already at $NEW (no changes)."
  exit 0
fi

# --- VERSION (atomic) ---
TMP_VERSION="$(mktemp)"
printf '%s\n' "$NEW" > "$TMP_VERSION"
mv "$TMP_VERSION" VERSION

# --- package.json (atomic; preserve key order + 2-space indent) ---
node - "$NEW" <<'NODE'
const fs = require("fs");
const path = require("path");
const newVersion = process.argv[2];
const file = path.resolve("package.json");
const raw = fs.readFileSync(file, "utf-8");
const pkg = JSON.parse(raw);
pkg.version = newVersion;
const trailingNewline = raw.endsWith("\n") ? "\n" : "";
const tmp = file + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(pkg, null, 2) + trailingNewline);
fs.renameSync(tmp, file);
NODE

# --- package-lock.json (atomic; only root + packages[""] version) ---
node - "$NEW" <<'NODE'
const fs = require("fs");
const path = require("path");
const newVersion = process.argv[2];
const file = path.resolve("package-lock.json");
const raw = fs.readFileSync(file, "utf-8");
const lock = JSON.parse(raw);
lock.version = newVersion;
if (lock.packages && lock.packages[""]) {
  lock.packages[""].version = newVersion;
}
const trailingNewline = raw.endsWith("\n") ? "\n" : "";
const tmp = file + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(lock, null, 2) + trailingNewline);
fs.renameSync(tmp, file);
NODE

echo "Version bumped ${OLD} → ${NEW}. Updated: VERSION, package.json, package-lock.json"
