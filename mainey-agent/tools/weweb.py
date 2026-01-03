from __future__ import annotations

import json


def build_weweb_js_snippet(description: str, payload: dict | None = None) -> str:
    """
    Returns a copy/paste-friendly WeWeb JS snippet.
    The snippet is intentionally generic so it works in a wide range of WeWeb blocks.
    """
    safe_payload = payload or {}
    payload_json = json.dumps(safe_payload, ensure_ascii=False, indent=2)

    return "\n".join(
        [
            "// Mainey Agent – WeWeb block snippet",
            f"// Purpose: {description}",
            "",
            "(function () {",
            "  // Example: store something in WeWeb variables",
            "  // wwLib.wwVariable.updateValue('myVar', 'value')",
            "",
            "  const payload = " + payload_json.replace("\n", "\n  ") + ";",
            "  console.log('[MaineyAgent] payload', payload);",
            "})();",
        ]
    )

