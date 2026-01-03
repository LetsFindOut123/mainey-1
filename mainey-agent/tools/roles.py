from __future__ import annotations

from dataclasses import dataclass, field


DEFAULT_ROLE_POLICIES: dict[str, set[str]] = {
    # Mostly safe: can generate snippets and read memory/history
    "viewer": {"weweb_snippet"},
    # Can call external APIs but not trigger editor edits
    "operator": {"weweb_snippet", "xano_request"},
    # Full access
    "developer": {"weweb_snippet", "xano_request", "cursor_edit"},
}


@dataclass(frozen=True)
class RoleGuard:
    role: str
    policies: dict[str, set[str]] = field(
        default_factory=lambda: {k: set(v) for k, v in DEFAULT_ROLE_POLICIES.items()}
    )

    def require(self, capability: str) -> None:
        allowed = self.policies.get(self.role, set())
        if capability not in allowed:
            raise PermissionError(
                f"Role '{self.role}' is not allowed to use capability '{capability}'. "
                f"Allowed: {sorted(allowed)}"
            )

