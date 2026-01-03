from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json
import re
import shutil
from typing import Any, Iterable

DEFAULT_PATCH_SCOPE = ["app/", "components/", "contracts/", "supabase/", "mainey-agent/"]


def _utc_ts_compact() -> str:
    # Example: 20260103T213045Z
    return datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")


def _safe_rel_path(p: str) -> str:
    p = p.strip().lstrip("/")
    if not p or p.startswith("..") or "/../" in p or "\\..\\" in p:
        raise ValueError(f"Unsafe path in patch: {p!r}")
    return p.replace("\\", "/")


def _in_scope(path: str, scope: list[str]) -> bool:
    return any(path.startswith(prefix) for prefix in scope)


def _write_json(path: Path, obj: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def _write_text(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


@dataclass(frozen=True)
class PatchBundle:
    out_dir: Path
    plan_path: Path
    patch_path: Path
    manifest_path: Path
    backup_dir: Path


def create_bundle(repo_root: Path) -> PatchBundle:
    out_dir = (repo_root / "mainey-agent" / "out" / _utc_ts_compact()).resolve()
    return PatchBundle(
        out_dir=out_dir,
        plan_path=out_dir / "plan.json",
        patch_path=out_dir / "changes.patch",
        manifest_path=out_dir / "manifest.json",
        backup_dir=out_dir / "backup",
    )


def validate_patch_scope(patch_text: str, scope: list[str]) -> list[str]:
    """
    Returns a list of offending file paths (empty means OK).
    """
    offenders: list[str] = []
    from unidiff import PatchSet  # type: ignore

    ps = PatchSet(patch_text.splitlines(True))
    for f in ps:
        rel = _safe_rel_path(f.path)
        if not _in_scope(rel, scope):
            offenders.append(rel)
    return offenders


def apply_patch(repo_root: Path, patch_text: str, bundle: PatchBundle, scope: list[str]) -> list[str]:
    """
    Applies unified diffs to files under repo_root.
    Backs up originals to bundle.backup_dir/<path>.
    Returns list of applied file paths (relative).
    """
    offenders = validate_patch_scope(patch_text, scope)
    if offenders:
        raise ValueError(f"Patch modifies out-of-scope paths: {offenders}")

    from unidiff import PatchSet  # type: ignore

    ps = PatchSet(patch_text.splitlines(True))
    applied: list[str] = []

    for f in ps:
        rel_path = _safe_rel_path(f.path)
        target_path = (repo_root / rel_path).resolve()
        if not str(target_path).startswith(str(repo_root.resolve())):
            raise ValueError(f"Unsafe resolved path: {target_path}")

        target_path.parent.mkdir(parents=True, exist_ok=True)

        # backup
        backup_path = bundle.backup_dir / rel_path
        backup_path.parent.mkdir(parents=True, exist_ok=True)
        if target_path.exists():
            shutil.copy2(target_path, backup_path)

        if f.is_removed_file:
            if target_path.exists():
                target_path.unlink()
            applied.append(rel_path)
            continue

        original_lines: list[str]
        if target_path.exists():
            original_lines = target_path.read_text(encoding="utf-8").splitlines(True)
        else:
            original_lines = []

        out_lines: list[str] = []
        idx = 0  # 0-based index into original_lines

        for hunk in f:
            # Copy lines before hunk
            hunk_start = max(0, hunk.source_start - 1)
            if hunk_start > len(original_lines):
                raise ValueError(f"Hunk start beyond file length for {rel_path}")
            out_lines.extend(original_lines[idx:hunk_start])
            idx = hunk_start

            for line in hunk:
                if line.is_context:
                    if idx >= len(original_lines):
                        raise ValueError(f"Context beyond EOF for {rel_path}")
                    out_lines.append(original_lines[idx])
                    idx += 1
                elif line.is_removed:
                    if idx >= len(original_lines):
                        raise ValueError(f"Remove beyond EOF for {rel_path}")
                    idx += 1
                elif line.is_added:
                    out_lines.append(line.value)

        out_lines.extend(original_lines[idx:])
        target_path.write_text("".join(out_lines), encoding="utf-8")
        applied.append(rel_path)

    return applied


def task_implies_repo_change(task: str) -> bool:
    t = task.lower()
    return any(k in t for k in ["fix", "refactor", "change", "edit", "update", "implement", "add", "remove"])


def suggest_paths_from_task(task: str) -> list[str]:
    """
    Best-effort extraction of file paths mentioned in task string.
    """
    # Matches things like app/foo.tsx or mainey-agent/main.py
    pattern = re.compile(r"(?P<path>(?:app|components|contracts|supabase|mainey-agent)/[A-Za-z0-9._\\-/]+)")
    return [m.group("path").replace("\\", "/") for m in pattern.finditer(task)]


def generate_patch_with_llm(task: str, repo_root: Path, scope: list[str], model: Any) -> str:
    """
    Uses an LLM (temperature 0) to output a unified diff patch.
    Keeps prompt small: includes only mentioned file contents when possible.
    """
    from langchain_core.messages import SystemMessage, HumanMessage

    mentioned = [p for p in suggest_paths_from_task(task) if _in_scope(p, scope)]
    context: list[dict[str, str]] = []
    for p in mentioned[:8]:
        fp = (repo_root / p).resolve()
        if fp.exists() and fp.is_file():
            try:
                context.append({"path": p, "content": fp.read_text(encoding="utf-8")})
            except Exception:
                pass

    system = SystemMessage(
        content=(
            "You are Mainey Operator. Output ONLY a unified diff patch.\n"
            "Rules:\n"
            "- ONLY modify paths under this allowlist: " + ", ".join(scope) + "\n"
            "- If you cannot confidently edit, output an empty patch.\n"
            "- Use standard git-style unified diff with 'diff --git' headers.\n"
            "- Keep changes minimal and deterministic."
        )
    )
    human = HumanMessage(
        content=(
            "Task:\n"
            f"{task}\n\n"
            "If any files are provided below, they are the current contents:\n"
            + json.dumps(context, ensure_ascii=False, indent=2)
        )
    )

    msg = model.invoke([system, human])
    text = (getattr(msg, "content", "") or "").strip()
    if not text:
        return ""
    return text + ("\n" if not text.endswith("\n") else "")


def emit_patch_bundle(
    repo_root: Path,
    task: str,
    role: str,
    plan: dict[str, Any],
    scope: list[str] | None = None,
    emit_patch: bool = True,
    apply: bool = False,
    llm_model: Any | None = None,
) -> PatchBundle:
    scope = scope or list(DEFAULT_PATCH_SCOPE)
    bundle = create_bundle(repo_root)

    _write_json(bundle.plan_path, {"role": role, "plan": plan, "task": task})

    patch_text = ""
    patch_needed = task_implies_repo_change(task) or bool(plan.get("cursor_edits"))

    if emit_patch:
        if patch_needed and llm_model is not None:
            patch_text = generate_patch_with_llm(task=task, repo_root=repo_root, scope=scope, model=llm_model)
            offenders = validate_patch_scope(patch_text, scope)
            if offenders:
                # Safety: refuse out-of-scope diffs.
                patch_text = ""
        # Always write a patch file (even if empty) so the bundle is deterministic.
        if not patch_text:
            patch_text = "# Empty patch (no changes emitted)\n"
        _write_text(bundle.patch_path, patch_text)

    applied_files: list[str] = []
    if apply and emit_patch and patch_text:
        applied_files = apply_patch(repo_root=repo_root, patch_text=patch_text, bundle=bundle, scope=scope)

    _write_json(
        bundle.manifest_path,
        {
            "ts": bundle.out_dir.name,
            "task": task,
            "role": role,
            "emitPatch": emit_patch,
            "applyPatch": apply,
            "scope": scope,
            "appliedFiles": applied_files,
        },
    )

    return bundle

