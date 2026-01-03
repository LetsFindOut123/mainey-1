from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json
import subprocess
import sys
from typing import Any


@dataclass(frozen=True)
class SmokeResult:
    ok: bool
    checks: list[dict[str, Any]]


def _run(cmd: list[str], cwd: Path, timeout_s: int = 600) -> tuple[int, str]:
    proc = subprocess.run(cmd, cwd=str(cwd), capture_output=True, text=True, timeout=timeout_s)
    out = (proc.stdout or "") + (("\n" + proc.stderr) if proc.stderr else "")
    return proc.returncode, out


def _check_contracts(repo_root: Path) -> dict[str, Any]:
    contracts_dir = repo_root / "contracts"
    if not contracts_dir.exists():
        return {"name": "contracts", "ok": False, "details": "contracts/ directory missing"}

    files = sorted(p for p in contracts_dir.glob("*.json") if p.is_file())
    if not files:
        return {"name": "contracts", "ok": False, "details": "No contracts/*.json files found"}

    allowed_auth = {"public", "user", "admin"}
    errors: list[str] = []
    for fp in files:
        try:
            obj = json.loads(fp.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{fp.name}: invalid JSON ({e})")
            continue

        if fp.name != "_shared.json":
            if not isinstance(obj, dict):
                errors.append(f"{fp.name}: root must be object")
                continue
            if not obj.get("module") or not obj.get("version"):
                errors.append(f"{fp.name}: missing module/version")
            eps = obj.get("endpoints")
            if not isinstance(eps, list) or not eps:
                errors.append(f"{fp.name}: endpoints must be non-empty array")
            else:
                for i, ep in enumerate(eps):
                    if not isinstance(ep, dict):
                        errors.append(f"{fp.name}: endpoints[{i}] must be object")
                        continue
                    if not ep.get("method") or not ep.get("path") or not ep.get("name"):
                        errors.append(f"{fp.name}: endpoints[{i}] missing name/method/path")
                    auth = ep.get("auth")
                    if auth not in allowed_auth:
                        errors.append(f"{fp.name}: endpoints[{i}] auth must be one of {sorted(allowed_auth)}")

    return {"name": "contracts", "ok": not errors, "details": errors or f"Validated {len(files)} contract files"}


def _check_supabase_schema(repo_root: Path) -> dict[str, Any]:
    fp = repo_root / "supabase" / "schema.sql"
    if not fp.exists():
        return {"name": "supabase_schema", "ok": False, "details": "supabase/schema.sql missing"}
    text = fp.read_text(encoding="utf-8")
    if "create table" not in text.lower():
        return {"name": "supabase_schema", "ok": False, "details": "No CREATE TABLE statements found"}
    if ";" not in text:
        return {"name": "supabase_schema", "ok": False, "details": "Schema file seems un-terminated (no semicolons)"}
    return {"name": "supabase_schema", "ok": True, "details": "Schema file present and non-empty"}


def _check_next_build(repo_root: Path) -> dict[str, Any]:
    pkg = repo_root / "package.json"
    if not pkg.exists():
        return {"name": "next_build", "ok": True, "details": "No package.json; skipping Next build"}

    node_modules_next = repo_root / "node_modules" / ".bin" / "next"
    if not node_modules_next.exists():
        code, out = _run(["npm", "install"], cwd=repo_root, timeout_s=900)
        if code != 0:
            return {"name": "next_build", "ok": False, "details": "npm install failed", "output": out[-4000:]}

    code, out = _run(["npm", "run", "build"], cwd=repo_root, timeout_s=900)
    return {"name": "next_build", "ok": code == 0, "details": "next build", "output": out[-4000:] if code != 0 else ""}


def _check_agent_self(repo_root: Path) -> dict[str, Any]:
    agent_main = repo_root / "mainey-agent" / "main.py"
    if not agent_main.exists():
        return {"name": "agent_self", "ok": False, "details": "mainey-agent/main.py missing"}

    # Run the agent in the current interpreter to avoid requiring external wrappers.
    code, out = _run([sys.executable, str(agent_main), "anything", "--weweb", "Smoke test snippet"], cwd=repo_root)
    ok = code == 0 and "WeWeb block snippet" in out
    return {"name": "agent_self", "ok": ok, "details": "agent weweb snippet", "output": out[-2000:] if not ok else ""}


def _check_agent_tests(repo_root: Path) -> dict[str, Any]:
    tests_dir = repo_root / "mainey-agent" / "tests"
    if not tests_dir.exists():
        return {"name": "agent_tests", "ok": False, "details": "mainey-agent/tests missing"}

    code, out = _run(
        [sys.executable, "-m", "unittest", "discover", "-s", str(tests_dir), "-p", "test_*.py"],
        cwd=repo_root,
        timeout_s=300,
    )
    return {"name": "agent_tests", "ok": code == 0, "details": "unittest", "output": out[-4000:] if code != 0 else ""}


def run_smoke(repo_root: Path) -> SmokeResult:
    checks = [
        _check_contracts(repo_root),
        _check_supabase_schema(repo_root),
        _check_next_build(repo_root),
        _check_agent_self(repo_root),
        _check_agent_tests(repo_root),
    ]
    ok = all(c.get("ok") for c in checks)
    return SmokeResult(ok=ok, checks=checks)

