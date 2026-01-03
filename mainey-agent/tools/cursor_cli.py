from __future__ import annotations

from dataclasses import dataclass
import shutil
import subprocess


@dataclass(frozen=True)
class CursorCLI:
    """
    Thin wrapper around the Cursor CLI, if available.

    Note: Cursor CLI flags can vary by installation; this wrapper is conservative
    and focuses on availability detection + safe invocation.
    """

    executable: str = "cursor"

    def is_available(self) -> bool:
        return shutil.which(self.executable) is not None

    def run(self, args: list[str], timeout_s: int = 120) -> dict:
        if not self.is_available():
            raise RuntimeError(
                "Cursor CLI not found on PATH. Install it or ensure `cursor` is available."
            )

        proc = subprocess.run(
            [self.executable, *args],
            capture_output=True,
            text=True,
            timeout=timeout_s,
        )
        return {
            "returncode": proc.returncode,
            "stdout": proc.stdout,
            "stderr": proc.stderr,
        }

