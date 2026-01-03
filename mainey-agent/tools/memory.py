from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import json


@dataclass
class RollingMemory:
    path: Path
    max_items: int = 20

    def load(self) -> list[dict]:
        try:
            raw = self.path.read_text(encoding="utf-8").strip()
            if not raw:
                return []
            data = json.loads(raw)
            return data if isinstance(data, list) else []
        except FileNotFoundError:
            return []
        except Exception:
            return []

    def add(self, item: dict) -> None:
        items = self.load()
        items.append(item)
        items = items[-self.max_items :]
        self.path.parent.mkdir(parents=True, exist_ok=True)
        self.path.write_text(json.dumps(items, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

