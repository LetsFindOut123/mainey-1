from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
import os


@dataclass(frozen=True)
class Settings:
    xano_api_key: str | None
    xano_base_url: str | None
    xano_auth_header: str
    xano_auth_scheme: str | None
    openai_api_key: str | None
    openai_model: str
    role: str
    history_path: Path
    memory_path: Path

    @staticmethod
    def from_env(project_root: Path) -> "Settings":
        # Paths are relative to the mainey-agent folder by default
        history_rel = os.getenv("MAINEY_AGENT_HISTORY_PATH", ".history/tasks.jsonl")
        memory_rel = os.getenv("MAINEY_AGENT_MEMORY_PATH", ".history/memory.json")

        return Settings(
            xano_api_key=os.getenv("XANO_API_KEY"),
            xano_base_url=os.getenv("XANO_BASE_URL"),
            xano_auth_header=os.getenv("XANO_AUTH_HEADER", "Authorization"),
            xano_auth_scheme=os.getenv("XANO_AUTH_SCHEME", "Bearer"),
            openai_api_key=os.getenv("OPENAI_API_KEY"),
            openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini"),
            role=os.getenv("MAINEY_AGENT_ROLE", "developer"),
            history_path=(project_root / history_rel).resolve(),
            memory_path=(project_root / memory_rel).resolve(),
        )

