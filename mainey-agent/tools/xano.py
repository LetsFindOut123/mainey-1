from __future__ import annotations

from dataclasses import dataclass
import json
import requests


@dataclass(frozen=True)
class XanoClient:
    base_url: str
    api_key: str | None = None
    auth_header: str = "Authorization"
    auth_scheme: str | None = "Bearer"
    timeout_s: int = 30

    def request(
        self,
        method: str,
        path: str,
        json_body: dict | None = None,
        params: dict | None = None,
        allow_statuses: set[int] | None = None,
    ) -> dict:
        url = self.base_url.rstrip("/") + "/" + path.lstrip("/")
        headers = {"Accept": "application/json"}
        if self.api_key:
            # Xano commonly uses Authorization: Bearer <token>
            if self.auth_scheme:
                headers[self.auth_header] = f"{self.auth_scheme} {self.api_key}"
            else:
                headers[self.auth_header] = self.api_key

        resp = requests.request(
            method=method.upper(),
            url=url,
            headers=headers,
            json=json_body,
            params=params,
            timeout=self.timeout_s,
        )

        content_type = (resp.headers.get("content-type") or "").lower()
        if "application/json" in content_type:
            data = resp.json()
        else:
            data = {"text": resp.text}

        if resp.status_code >= 400:
            if allow_statuses and resp.status_code in allow_statuses:
                return {
                    "status": resp.status_code,
                    "url": url,
                    "data": data,
                    "allowed_error": True,
                }
            raise RuntimeError(
                f"Xano request failed: {resp.status_code} {resp.reason} for {method.upper()} {url}\n"
                + json.dumps(data, ensure_ascii=False, indent=2)
            )

        return {
            "status": resp.status_code,
            "url": url,
            "data": data,
        }

