#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js is not installed or not on PATH."
  echo "Install Node 18+ from https://nodejs.org/ (or via your OS package manager)."
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm is not installed or not on PATH."
  echo "Install Node 18+ from https://nodejs.org/ (npm is included)."
  exit 1
fi

if [[ ! -d "$repo_root/node_modules" ]]; then
  npm install
fi

# Avoid occasional Next.js ENOTEMPTY cleanup errors
rm -rf "$repo_root/.next"

npm run build

