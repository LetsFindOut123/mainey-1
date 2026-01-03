#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

agent_dir="$repo_root/mainey-agent"
venv_python="$agent_dir/.venv/bin/python"

# Ensure bootstrapped
"$repo_root/scripts/mainey_agent_bootstrap.sh"

if [[ "${1:-}" == "--weweb" ]]; then
  shift || true
  desc="${1:-}"
  if [[ -z "$desc" && -t 0 ]]; then
    read -r -p "WeWeb snippet description: " desc
  fi
  if [[ -z "${desc:-}" ]]; then
    echo "ERROR: Missing WeWeb snippet description."
    exit 2
  fi
  exec "$venv_python" "$agent_dir/main.py" "anything" --weweb "$desc"
fi

task="${*:-}"
if [[ -z "$task" && -t 0 ]]; then
  read -r -p "Task: " task
fi
if [[ -z "${task:-}" ]]; then
  echo "ERROR: Missing task string."
  exit 2
fi

exec "$venv_python" "$agent_dir/main.py" "$task"

