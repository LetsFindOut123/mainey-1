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
