# Mainey Home Portal (Phase 1)

A Next.js 15 + Tailwind + Supabase starter for the Mainey ecosystem.
Includes header navigation for: Home, Feed, Discover, Community, Gigs, Events, Calendar, Projects, Companies, Spaces, Fundraising, Marketplace, and Profile.

## 1) Prerequisites
- Node 18+
- Git + GitHub repo
- Supabase project (get Project URL + anon key)
- Vercel account linked to your GitHub

## 2) Environment Variables
Create `.env.local` (or set in Vercel Project Settings → Environment Variables):
```env
NEXT_PUBLIC_SUPABASE_URL=your-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

## 3) Install & Run
```bash
npm install
npm run dev
```

## 4) Deploy
Push to GitHub. Vercel will auto-build and deploy.

## 5) Supabase Schema
In Supabase → SQL Editor → paste the contents of `supabase/schema.sql` and run it.

## Next Steps
- Hook up real queries on each page
- Add Supabase Auth UI for profile editing
- Build project dashboards + calendar sync

## Mainey Agent (CLI scaffold)

This repo also includes a small Python CLI scaffold in `mainey-agent/` for automation tasks (Xano calls, WeWeb snippet generation, lightweight memory/history).

- Setup: see `mainey-agent/README.md`
- Run: `python3 mainey-agent/main.py "your task here"`

## No-terminal: run Mainey Agent via Cursor Tasks

You can bootstrap and run the agent **without typing any terminal commands**:

- In Cursor: **Command Palette** → **Tasks: Run Task**
  - **Mainey Agent: Bootstrap** (one-time, idempotent)
  - **Mainey Agent: Run (interactive)** (prompts for the task string)
  - **Mainey Agent: WeWeb Snippet (prompt for description)** (prompts for a description and prints a JS snippet)

This uses the scripts in `scripts/` to create `mainey-agent/.venv`, install dependencies, and (if needed) guide you through creating `mainey-agent/.env`. Secrets are gitignored.

## Architecture: Mainey 1 vs Mainey 2/3 runway

- **Mainey 1 (public beta)**: Next.js + Supabase is the production app.
- **Stable internal API boundary (now)**:
  - **Contracts** live in `contracts/*.json` (machine-readable, consistent shapes).
  - **Internal APIs** live under `app/api/*` and are treated as the only interface the UI depends on.
  - This lets us swap/extend implementations later (Mainey 2/3) without rewriting the product UI.
- **Mainey 2/3 (upgrade path)**:
  - Replace or augment `/api/*` implementations with additional services (Xano, queues, search, custom backends) while keeping the same contracts.
  - Keep Supabase RLS in place as a baseline authorization layer.
- **Operator agent**:
  - `mainey-agent` can emit deterministic patch bundles to `mainey-agent/out/...` and run smoke tests, so upgrades stay repeatable and auditable.
