from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
import json


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class TaskHistory:
    path: Path

    def append(self, record: dict) -> None:
        self.path.parent.mkdir(parents=True, exist_ok=True)
        payload = {"ts": _utc_now_iso(), **record}
        with self.path.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")

