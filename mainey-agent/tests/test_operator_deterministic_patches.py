import os
import subprocess
import sys
import time
import unittest
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
AGENT_MAIN = REPO_ROOT / "mainey-agent" / "main.py"
OUT_DIR = REPO_ROOT / "mainey-agent" / "out"


def _list_out_dirs() -> set[str]:
    if not OUT_DIR.exists():
        return set()
    return {p.name for p in OUT_DIR.iterdir() if p.is_dir()}


def _new_out_dir(before: set[str], after: set[str]) -> Path:
    new = sorted(list(after - before))
    if len(new) != 1:
        raise AssertionError(f"Expected exactly 1 new out dir, got {new}")
    return OUT_DIR / new[0]


def _run_agent(task: str) -> Path:
    before = _list_out_dirs()

    env = os.environ.copy()
    env.pop("OPENAI_API_KEY", None)
    env.pop("OPENAI_MODEL", None)

    # Keep history/memory writes isolated to avoid test flakiness.
    env["MAINEY_AGENT_HISTORY_PATH"] = ".history/test_tasks.jsonl"
    env["MAINEY_AGENT_MEMORY_PATH"] = ".history/test_memory.json"

    proc = subprocess.run(
        [sys.executable, str(AGENT_MAIN), task],
        cwd=str(REPO_ROOT),
        env=env,
        capture_output=True,
        text=True,
        timeout=120,
    )
    if proc.returncode != 0:
        raise AssertionError(f"Agent failed: {proc.stdout}\n{proc.stderr}")

    # Wait a moment for filesystem timestamp dir creation
    for _ in range(10):
        after = _list_out_dirs()
        if after != before:
            return _new_out_dir(before, after)
        time.sleep(0.1)

    raise AssertionError("No out dir created by agent")


class TestDeterministicPatchesWithoutLLM(unittest.TestCase):
    def _assert_non_empty_patch(self, out_dir: Path):
        patch = (out_dir / "changes.patch").read_text(encoding="utf-8").strip()
        self.assertTrue(patch and "Empty patch" not in patch, f"Patch was empty:\n{patch}")

    def test_add_new_contract_file(self):
        out_dir = _run_agent('add a new contract file contracts/example.json')
        self._assert_non_empty_patch(out_dir)

    def test_add_new_api_route_skeleton(self):
        out_dir = _run_agent('add a new api route skeleton app/api/example/route.ts')
        self._assert_non_empty_patch(out_dir)

    def test_update_readme_insert_header(self):
        out_dir = _run_agent('update README by inserting a section header "Operator Test Header"')
        self._assert_non_empty_patch(out_dir)


if __name__ == "__main__":
    unittest.main()

