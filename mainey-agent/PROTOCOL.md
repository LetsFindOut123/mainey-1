## Mainey Agent Protocol (v1.1)

This document defines:

- **Command protocol**: how a task is expressed, planned, and (optionally) executed.
- **Task taxonomy**: standardized task categories and required metadata for consistent behavior.

### Goals

- **Deterministic I/O**: agent outputs machine-readable JSON.
- **Safe by default**: plans are printed, execution requires explicit flags.
- **Auditable**: history + memory are persisted locally.
- **Composable**: plans contain tool calls that can be executed or inspected independently.

---

## Command Protocol

### CLI surface

Primary mode:

```bash
python3 mainey-agent/main.py "<task text>"
```

Optional execution gates:

- `--run-xano`: execute planned Xano calls
- `--run-cursor`: execute (or record) planned Cursor edits

Manual tool modes:

- `--xano METHOD PATH`: execute a single Xano request
- `--weweb "description"`: print a WeWeb snippet

Role guard:

- `--role viewer|operator|developer`

### Output contract

In primary mode, the agent MUST print a single JSON object to stdout:

```json
{
  "role": "developer",
  "plan": {
    "summary": "string",
    "xano_calls": [
      { "method": "GET", "path": "/path", "json": null, "params": null }
    ],
    "cursor_edits": [
      { "note": "string", "prompt": "string" }
    ],
    "weweb_snippet": { "description": "string", "payload": {} }
  }
}
```

Rules:

- `xano_calls`, `cursor_edits` default to empty arrays.
- `weweb_snippet` is either `null` or `{description, payload}`.
- Tool execution is **never implied** by output. Execution requires explicit CLI flags.

### Tool-call schemas

#### Xano call

```json
{ "method": "GET|POST|PUT|PATCH|DELETE", "path": "/relative", "json": {}, "params": {} }
```

Semantics:

- `path` is appended to `XANO_BASE_URL`.
- `json` is the request body (or `null`).
- `params` is the querystring dict (or `null`).

#### Cursor edit intent

```json
{ "note": "why this edit exists", "prompt": "full instruction for the code change" }
```

Semantics:

- This is an *intent* that can be executed by wiring Cursor CLI args.
- The scaffold currently records intents into history when `--run-cursor` is used.

#### WeWeb snippet request

```json
{ "description": "human readable description", "payload": {} }
```

Semantics:

- Printed as copy/paste JavaScript.
- Payload must be JSON-serializable.

### Safety + execution gating

Capabilities are role-gated:

- `viewer`: `weweb_snippet`
- `operator`: `weweb_snippet`, `xano_request`
- `developer`: `weweb_snippet`, `xano_request`, `cursor_edit`

Execution is CLI-gated:

- Plans are always printed.
- `--run-xano` is required to execute any planned `xano_calls`.
- `--run-cursor` is required to execute/record any `cursor_edits`.

### Persistence protocol

History is append-only JSONL:

- Path: `MAINEY_AGENT_HISTORY_PATH` (default `mainey-agent/.history/tasks.jsonl`)
- Each line MUST be a single JSON object with an ISO timestamp:

```json
{ "ts": "ISO-8601", "type": "agent_task|xano_request|weweb_snippet|cursor_edit_intent", "...": "..." }
```

Memory is a rolling JSON array:

- Path: `MAINEY_AGENT_MEMORY_PATH` (default `mainey-agent/.history/memory.json`)
- Contents are a list of recent summary objects.

---

## Task Taxonomy (v1.1)

### Why taxonomy

Taxonomy makes tasks:

- easier to route to the right tools
- easier to track over time
- consistent to automate (UI, dashboards, reporting)

### Canonical categories

Each task SHOULD map to one primary category (and optional secondary tags):

1. **auth**
   - Signup/login/session handling, guards, redirects
2. **api**
   - REST calls, Xano/Supabase integration, request/response shaping
3. **frontend**
   - UI changes, components, styling, UX flows
4. **backend**
   - Schemas, server functions, business logic (if present)
5. **automation**
   - WeWeb snippets, browser automation, workflow scripts
6. **bugfix**
   - Narrow issue remediation; expected to include reproduction + verification
7. **refactor**
   - Behavioral equivalence with improved structure
8. **performance**
   - Latency, bundle size, render time improvements
9. **security**
   - Secrets, authz, threat mitigation, dependency risks
10. **docs**
   - README, runbooks, protocol docs, examples
11. **ops**
   - CI, build tooling, deployment configuration

### Task record schema (recommended)

When recording/handing off tasks, use:

```json
{
  "id": "optional string",
  "title": "short string",
  "category": "one of the categories above",
  "tags": ["optional", "strings"],
  "inputs": { "optional": "object" },
  "constraints": ["safe-by-default", "no destructive ops", "etc"],
  "definition_of_done": ["bullet strings"],
  "risk_level": "low|medium|high"
}
```

### Example mappings

- “Lock Auth v1.1 end-to-end: signup → login → dashboard” → `auth`, `frontend`, `security`
- “Call Xano /users/me and store into WeWeb variable” → `api`, `automation`
- “Remove signup logic from dashboard and enforce guards” → `auth`, `security`, `bugfix`

