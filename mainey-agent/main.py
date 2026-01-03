from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

from tools.cursor_cli import CursorCLI
from tools.history import TaskHistory
from tools.memory import RollingMemory
from tools.roles import RoleGuard
from tools.settings import Settings
from tools.weweb import build_weweb_js_snippet
from tools.xano import XanoClient


PROJECT_ROOT = Path(__file__).resolve().parent
PROTOCOL_PATH = PROJECT_ROOT / "PROTOCOL.md"


def _try_llm_plan(task: str, settings: Settings, memory_items: list[dict]) -> dict[str, Any] | None:
    """
    Optional: if OPENAI_API_KEY is set AND langchain is installed, return a JSON plan.
    We keep this best-effort so the agent still runs without any LLM deps/keys.
    """
    if not settings.openai_api_key:
        return None
    try:
        from langchain_openai import ChatOpenAI
        from langchain_core.messages import SystemMessage, HumanMessage
    except Exception:
        return None

    model = ChatOpenAI(model=settings.openai_model, temperature=0)
    system = SystemMessage(
        content=(
            "You are a practical software agent. Output ONLY valid JSON.\n"
            "Return shape:\n"
            "{\n"
            '  "summary": string,\n'
            '  "xano_calls": [{"method": "GET|POST|PUT|PATCH|DELETE", "path": string, "json": object|null, "params": object|null}],\n'
            '  "cursor_edits": [{"note": string, "prompt": string}],\n'
            '  "weweb_snippet": {"description": string, "payload": object|null} | null\n'
            "}\n"
            "If you are unsure, keep arrays empty and weweb_snippet null."
        )
    )
    human = HumanMessage(
        content=(
            "Task:\n"
            f"{task}\n\n"
            "Recent memory (may be empty):\n"
            f"{json.dumps(memory_items[-5:], ensure_ascii=False, indent=2)}"
        )
    )

    msg = model.invoke([system, human])
    content = getattr(msg, "content", "")
    try:
        return json.loads(content)
    except Exception:
        return None


def _heuristic_plan(task: str) -> dict[str, Any]:
    t = task.lower()
    wants_weweb = any(k in t for k in ["weweb", "block", "snippet", "inject"])
    wants_xano = any(k in t for k in ["xano", "endpoint", "api", "rest", "http"])
    wants_edit = any(k in t for k in ["fix", "refactor", "change", "edit", "update", "implement", "add"])

    return {
        "summary": task.strip(),
        "xano_calls": [] if not wants_xano else [{"method": "GET", "path": "/health", "json": None, "params": None}],
        "cursor_edits": [] if not wants_edit else [{"note": "Describe desired code changes", "prompt": task.strip()}],
        "weweb_snippet": None
        if not wants_weweb
        else {"description": task.strip(), "payload": {"task": task.strip()}},
    }


def main() -> int:
    parser = argparse.ArgumentParser(prog="mainey-agent", description="Mainey Agent scaffold CLI")
    parser.add_argument("task", help="Task instruction for the agent")
    parser.add_argument("--role", default=None, help="Role override (viewer|operator|developer)")

    # Explicit execution flags (safe-by-default)
    parser.add_argument("--run-xano", action="store_true", help="Actually execute planned Xano calls")
    parser.add_argument("--run-cursor", action="store_true", help="Actually attempt Cursor CLI calls")

    # Manual tool invocations
    parser.add_argument("--xano", nargs=2, metavar=("METHOD", "PATH"), help="Run a single Xano call immediately")
    parser.add_argument("--weweb", metavar="DESCRIPTION", help="Print a WeWeb JS snippet for DESCRIPTION")
    parser.add_argument("--protocol", action="store_true", help="Print Mainey Agent protocol + taxonomy")

    args = parser.parse_args()

    load_dotenv(PROJECT_ROOT / ".env", override=False)
    settings = Settings.from_env(PROJECT_ROOT)
    role = args.role or settings.role
    guard = RoleGuard(role=role)

    history = TaskHistory(settings.history_path)
    memory = RollingMemory(settings.memory_path)

    if args.protocol:
        text = PROTOCOL_PATH.read_text(encoding="utf-8")
        print(text)
        history.append({"type": "protocol_print", "role": role, "path": str(PROTOCOL_PATH)})
        memory.add({"type": "protocol_print"})
        return 0

    # Manual WeWeb snippet
    if args.weweb:
        guard.require("weweb_snippet")
        snippet = build_weweb_js_snippet(args.weweb, payload={"description": args.weweb})
        print(snippet)
        history.append({"type": "weweb_snippet", "role": role, "description": args.weweb})
        memory.add({"type": "weweb_snippet", "description": args.weweb})
        return 0

    # Manual Xano call
    if args.xano:
        guard.require("xano_request")
        if not settings.xano_base_url:
            raise RuntimeError("Missing XANO_BASE_URL (set it in mainey-agent/.env)")
        method, path = args.xano
        client = XanoClient(base_url=settings.xano_base_url, api_key=settings.xano_api_key)
        result = client.request(method=method, path=path)
        print(json.dumps(result, ensure_ascii=False, indent=2))
        history.append({"type": "xano_request", "role": role, "method": method, "path": path})
        memory.add({"type": "xano_request", "method": method, "path": path})
        return 0

    # Agent run
    task = args.task.strip()
    mem_items = memory.load()
    plan = _try_llm_plan(task, settings, mem_items) or _heuristic_plan(task)

    # Print plan
    print(json.dumps({"role": role, "plan": plan}, ensure_ascii=False, indent=2))

    history.append({"type": "agent_task", "role": role, "task": task, "plan": plan})
    memory.add({"type": "agent_task", "task": task})

    # Execute planned Xano calls (explicit opt-in)
    if args.run_xano and plan.get("xano_calls"):
        guard.require("xano_request")
        if not settings.xano_base_url:
            raise RuntimeError("Missing XANO_BASE_URL (set it in mainey-agent/.env)")
        client = XanoClient(base_url=settings.xano_base_url, api_key=settings.xano_api_key)
        results = []
        for call in plan["xano_calls"]:
            results.append(
                client.request(
                    method=call.get("method", "GET"),
                    path=call.get("path", "/"),
                    json_body=call.get("json"),
                    params=call.get("params"),
                )
            )
        print("\n# Xano results\n" + json.dumps(results, ensure_ascii=False, indent=2))

    # Execute Cursor edits (explicit opt-in, best-effort)
    if args.run_cursor and plan.get("cursor_edits"):
        guard.require("cursor_edit")
        cursor = CursorCLI()
        if not cursor.is_available():
            print("\n# Cursor\nCursor CLI not found; skipping cursor edits.")
            return 0

        # We do not assume a specific Cursor CLI interface; we store intended prompts in history.
        # If you have a known CLI workflow, wire it here.
        for edit in plan["cursor_edits"]:
            history.append({"type": "cursor_edit_intent", "role": role, "edit": edit})
        print("\n# Cursor\nRecorded cursor edit intents (wire Cursor CLI args as needed).")

    # Print WeWeb snippet if planned
    if plan.get("weweb_snippet"):
        guard.require("weweb_snippet")
        ws = plan["weweb_snippet"]
        snippet = build_weweb_js_snippet(ws.get("description", task), payload=ws.get("payload"))
        print("\n# WeWeb snippet\n" + snippet)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())

