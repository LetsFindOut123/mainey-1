#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

agent_dir="$repo_root/mainey-agent"
venv_dir="$agent_dir/.venv"
venv_python="$venv_dir/bin/python"
requirements="$agent_dir/requirements.txt"
env_file="$agent_dir/.env"

if ! command -v python3 >/dev/null 2>&1; then
  echo "ERROR: python3 is not installed or not on PATH."
  echo
  echo "Install instructions:"
  echo "- macOS (Homebrew): brew install python"
  echo "- Ubuntu/Debian:    sudo apt update && sudo apt install -y python3 python3-venv python3-pip"
  echo "- Fedora:           sudo dnf install -y python3 python3-virtualenv"
  echo "- Arch:             sudo pacman -S python"
  exit 1
fi

if ! python3 -c "import venv, ensurepip" >/dev/null 2>&1; then
  echo "ERROR: python3 is present, but virtualenv support (venv/ensurepip) is missing."
  echo
  echo "Install instructions:"
  echo "- Ubuntu/Debian: sudo apt update && sudo apt install -y python3-venv python3-pip"
  echo "- Fedora:        sudo dnf install -y python3 python3-virtualenv"
  echo "- Arch:          sudo pacman -S python"
  echo "- macOS:         reinstall/upgrade Python (brew install python)"
  exit 1
fi

if [[ ! -d "$agent_dir" ]]; then
  echo "ERROR: Expected directory not found: $agent_dir"
  exit 1
fi

if [[ ! -f "$requirements" ]]; then
  echo "ERROR: Expected requirements file not found: $requirements"
  exit 1
fi

if [[ ! -d "$venv_dir" ]]; then
  python3 -m venv "$venv_dir"
fi

if ! "$venv_python" -m pip install --upgrade pip >/dev/null 2>&1; then
  # Some distros create a venv pip without RECORD metadata; force-reinstall is safer.
  "$venv_python" -m ensurepip --upgrade >/dev/null 2>&1 || true
  "$venv_python" -m pip install --force-reinstall --no-deps "pip==24.0" >/dev/null 2>&1 || true
fi
"$venv_python" -m pip install -r "$requirements"

create_env_file() {
  local role_default="${MAINEY_AGENT_ROLE:-developer}"
  local xano_base_default="${XANO_BASE_URL:-}"
  local xano_key_default="${XANO_API_KEY:-}"
  local openai_key_default="${OPENAI_API_KEY:-}"

  local role="$role_default"
  local xano_base="$xano_base_default"
  local xano_key="$xano_key_default"
  local openai_key="$openai_key_default"

  # If interactive, prompt; otherwise rely on env defaults (safe for Cursor tasks / CI).
  if [[ -t 0 ]]; then
    echo
    echo "Mainey Agent env setup (creates mainey-agent/.env). Leave blank to skip optional values."
    read -r -p "ROLE [${role_default}]: " role_in || true
    if [[ -n "${role_in:-}" ]]; then role="$role_in"; fi

    read -r -p "XANO_BASE_URL (optional) [${xano_base_default}]: " xano_base_in || true
    if [[ -n "${xano_base_in:-}" ]]; then xano_base="$xano_base_in"; fi

    read -r -p "XANO_API_KEY (optional) [${xano_key_default:+(set)}]: " xano_key_in || true
    if [[ -n "${xano_key_in:-}" ]]; then xano_key="$xano_key_in"; fi

    read -r -p "OPENAI_API_KEY (optional) [${openai_key_default:+(set)}]: " openai_key_in || true
    if [[ -n "${openai_key_in:-}" ]]; then openai_key="$openai_key_in"; fi
  fi

  {
    echo "MAINEY_AGENT_ROLE=$role"
    if [[ -n "$xano_base" ]]; then echo "XANO_BASE_URL=$xano_base"; fi
    if [[ -n "$xano_key" ]]; then echo "XANO_API_KEY=$xano_key"; fi
    if [[ -n "$openai_key" ]]; then echo "OPENAI_API_KEY=$openai_key"; fi
  } >"$env_file"

  echo "Wrote $env_file (secrets are gitignored)."
}

if [[ ! -f "$env_file" ]]; then
  create_env_file
fi

echo "Bootstrap complete."
