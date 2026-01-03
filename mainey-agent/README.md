## Mainey Agent

A small CLI agent scaffold that can:

- Call Xano endpoints (REST) with `XANO_API_KEY` + `XANO_BASE_URL`
- Generate WeWeb block JavaScript snippets (copy/paste)
- Optionally invoke Cursor CLI for prompt-based edits (if `cursor` is available)
- Keep lightweight memory + task history on disk
- Enforce basic role-based tool guards

### Setup

Create `mainey-agent/.env`:

```env
XANO_API_KEY=your_xano_key
XANO_BASE_URL=https://your-xano-domain/api
XANO_AUTH_HEADER=Authorization
XANO_AUTH_SCHEME=Bearer

# Optional (only needed if you enable LLM planning)
OPENAI_API_KEY=your_openai_key
OPENAI_MODEL=gpt-4o-mini
```

Install dependencies:

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r mainey-agent/requirements.txt
```

### Run

```bash
python3 mainey-agent/main.py "Fix login bug and add success redirect to dashboard"
```

Safely execute planned Xano probes (allow certain non-2xx statuses like 401/404):

```bash
python3 mainey-agent/main.py "Validate Xano auth endpoints safely" --run-xano --xano-allow-status 401,403,404
```

### Protocol + taxonomy

See `mainey-agent/PROTOCOL.md` for the v1.1 command protocol and task taxonomy.

### Task history + memory

- History is appended to `mainey-agent/.history/tasks.jsonl`
- A small rolling memory snapshot is stored in `mainey-agent/.history/memory.json`

