#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
"$repo_root/scripts/mainey_agent_run.sh"

echo
echo "Press Enter to close..."
read -r _

