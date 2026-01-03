from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import difflib
import json
import re
from typing import Any, Optional


@dataclass(frozen=True)
class PlannedPatch:
    ok: bool
    needs_llm: bool
    reason: str
    patch_text: str


def _git_diff_for_file(rel_path: str, before: str | None, after: str | None) -> str:
    """
    Deterministically produce a git-style unified diff for a single file.
    - before=None means new file
    - after=None means delete file
    """
    a_path = f"a/{rel_path}"
    b_path = f"b/{rel_path}"

    if before is None and after is None:
        return ""

    before_lines = [] if before is None else before.splitlines(True)
    after_lines = [] if after is None else after.splitlines(True)

    if before is None:
        fromfile = "/dev/null"
        tofile = b_path
    elif after is None:
        fromfile = a_path
        tofile = "/dev/null"
    else:
        fromfile = a_path
        tofile = b_path

    diff = difflib.unified_diff(
        before_lines,
        after_lines,
        fromfile=fromfile,
        tofile=tofile,
        lineterm="\n",
    )
    body = "".join(diff)
    if not body:
        return ""
    return f"diff --git {a_path} {b_path}\n{body}"


def _normalize_section_title(task: str) -> str:
    # Heuristic: grab quoted title if present, otherwise a generic.
    m = re.search(r'"([^"]+)"', task)
    if m:
        return m.group(1).strip()
    return "Notes"


def plan_patch(repo_root: Path, task: str, scope: list[str]) -> PlannedPatch:
    t = task.strip()
    tl = t.lower()

    # Rule 1) Create new contract file: "add a new contract file contracts/example.json"
    m = re.search(r"(contracts/[A-Za-z0-9._-]+\.json)", t)
    if "add" in tl and "contract" in tl and m:
        rel = m.group(1)
        if not any(rel.startswith(p) for p in scope):
            return PlannedPatch(False, True, "out_of_scope", "# Empty patch (out of scope)\n")

        target = (repo_root / rel).resolve()
        before = target.read_text(encoding="utf-8") if target.exists() else None
        if before is not None:
            return PlannedPatch(False, False, "already_exists", "# Empty patch (already exists)\n")

        module_name = Path(rel).stem
        after_obj = {
            "module": module_name,
            "version": "1.0",
            "endpoints": [
                {
                    "name": f"TODO_{module_name}",
                    "method": "GET",
                    "path": f"/api/{module_name}",
                    "auth": "public",
                    "input": {},
                    "output": {"ok": True, "data": {}},
                    "todo": "Fill in contract details",
                }
            ],
            "errors": [{"code": "internal", "http": 500}],
        }
        after = json.dumps(after_obj, ensure_ascii=False, indent=2) + "\n"
        patch = _git_diff_for_file(rel, None, after)
        return PlannedPatch(True, False, "created_contract", patch)

    # Rule 2) Create new API route skeleton: "add a new api route skeleton app/api/example/route.ts"
    m = re.search(r"(app/api/[A-Za-z0-9._/-]+/route\.ts)", t)
    if ("add" in tl or "create" in tl) and ("route" in tl or "/api/" in tl) and m:
        rel = m.group(1)
        if not any(rel.startswith(p) for p in scope):
            return PlannedPatch(False, True, "out_of_scope", "# Empty patch (out of scope)\n")

        target = (repo_root / rel).resolve()
        before = target.read_text(encoding="utf-8") if target.exists() else None
        if before is not None:
            return PlannedPatch(False, False, "already_exists", "# Empty patch (already exists)\n")

        after = (
            "import { jsonError } from '@/app/api/_utils'\n\n"
            "export async function GET() {\n"
            "  return jsonError('not_implemented', 'TODO: Implement this endpoint', 501)\n"
            "}\n"
        )
        patch = _git_diff_for_file(rel, None, after)
        return PlannedPatch(True, False, "created_route_skeleton", patch)

    # Rule 3) README insertion: "update README by inserting a section header"
    if "readme" in tl and ("insert" in tl or "add" in tl) and ("section" in tl or "header" in tl):
        rel = "README.md"
        if not any(rel.startswith(p) for p in scope) and rel != "README.md":
            return PlannedPatch(False, True, "out_of_scope", "# Empty patch (out of scope)\n")

        target = (repo_root / rel).resolve()
        if not target.exists():
            return PlannedPatch(False, True, "missing_readme", "# Empty patch (README missing)\n")

        before = target.read_text(encoding="utf-8")
        title = _normalize_section_title(t)
        marker = f"## {title}\n"
        if marker in before:
            return PlannedPatch(False, False, "already_present", "# Empty patch (already present)\n")

        after = before.rstrip() + "\n\n" + marker + "\n"
        patch = _git_diff_for_file(rel, before, after)
        return PlannedPatch(True, False, "updated_readme", patch)

    # Rule 4) Endpoint skeleton by path mention (common operator ask)
    m = re.search(r"(/api/[A-Za-z0-9._/-]+)", t)
    if ("endpoint skeleton" in tl or "add endpoint" in tl) and m:
        path = m.group(1).strip("/")
        rel = f"app/api/{path}/route.ts"
        rel = rel.replace("/api/", "/")  # /api/events/[id] -> app/api/events/[id]/route.ts
        rel = "app/api/" + path.replace("/api/", "") + "/route.ts"
        rel = rel.replace("//", "/")
        if not any(rel.startswith(p) for p in scope):
            return PlannedPatch(False, True, "out_of_scope", "# Empty patch (out of scope)\n")
        target = (repo_root / rel).resolve()
        before = target.read_text(encoding="utf-8") if target.exists() else None
        if before is not None:
            return PlannedPatch(False, False, "already_exists", "# Empty patch (already exists)\n")
        after = (
            "import { jsonError } from '@/app/api/_utils'\n\n"
            "export async function GET() {\n"
            "  return jsonError('not_implemented', 'TODO: Implement this endpoint', 501)\n"
            "}\n"
        )
        patch = _git_diff_for_file(rel, None, after)
        return PlannedPatch(True, False, "created_endpoint_skeleton", patch)

    return PlannedPatch(False, True, "ambiguous_task", "# Empty patch (needs LLM or explicit targets)\n")

