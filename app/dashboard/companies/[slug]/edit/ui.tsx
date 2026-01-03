'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

type CompanyPage = {
  id: string
  type: string
  title: string | null
  content: any
  sortOrder: number
}

type Company = {
  id: string
  name: string
  slug: string
  bio: string | null
  websiteUrl: string | null
  logoUrl: string | null
  theme: any | null
}

function parseLinks(text: string): Array<{ label: string; url: string }> {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(line => {
      const [label, ...rest] = line.split('|')
      const url = (rest.join('|') || '').trim()
      if (!url) return { label: line, url: line }
      return { label: label.trim() || url, url }
    })
}

function serializeLinks(links: any): string {
  if (!Array.isArray(links)) return ''
  return links.map((l: any) => `${l.label || l.url}|${l.url || ''}`).join('\n')
}

export function EditCompanyClient() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug

  const [company, setCompany] = useState<Company | null>(null)
  const [pages, setPages] = useState<CompanyPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string | null>(null)

  const hero = useMemo(() => pages.find(p => p.type === 'hero')?.content || {}, [pages])
  const about = useMemo(() => pages.find(p => p.type === 'about')?.content || {}, [pages])
  const links = useMemo(() => pages.find(p => p.type === 'links')?.content || {}, [pages])

  const [name, setName] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [themeJson, setThemeJson] = useState('')

  const [heroHeadline, setHeroHeadline] = useState('')
  const [heroSub, setHeroSub] = useState('')
  const [heroCtaText, setHeroCtaText] = useState('')
  const [heroCtaUrl, setHeroCtaUrl] = useState('')

  const [aboutText, setAboutText] = useState('')
  const [linksText, setLinksText] = useState('')

  const [saving, setSaving] = useState(false)

  useEffect(() => {
    let alive = true
    if (!slug) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/companies/${encodeURIComponent(slug)}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load company.')
        if (!alive) return
        const c = json?.data?.company as Company
        const p = (json?.data?.pages ?? []) as CompanyPage[]
        setCompany(c)
        setPages(p)

        setName(c.name || '')
        setBio(c.bio || '')
        setWebsiteUrl(c.websiteUrl || '')
        setLogoUrl(c.logoUrl || '')
        setThemeJson(c.theme ? JSON.stringify(c.theme, null, 2) : '')

        setHeroHeadline(hero?.headline || c.name || '')
        setHeroSub(hero?.subheadline || '')
        setHeroCtaText(hero?.ctaText || '')
        setHeroCtaUrl(hero?.ctaUrl || '')

        setAboutText(about?.text || c.bio || '')
        setLinksText(serializeLinks(links?.links))
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Failed to load company.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug])

  async function saveAll() {
    if (!slug) return
    setSaving(true)
    setError(null)
    setStatus(null)
    try {
      let theme: any = null
      if (themeJson.trim()) {
        theme = JSON.parse(themeJson)
      }

      const res1 = await fetch(`/api/companies/${encodeURIComponent(slug)}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          bio: bio.trim() || null,
          website_url: websiteUrl.trim() || null,
          logo_url: logoUrl.trim() || null,
          theme,
        }),
      })
      const j1 = await res1.json().catch(() => null)
      if (!res1.ok) throw new Error(j1?.error?.message || 'Failed to update company.')

      const res2 = await fetch(`/api/companies/${encodeURIComponent(slug)}/pages`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          pages: [
            { type: 'hero', title: 'Hero', sort_order: 0, content: { headline: heroHeadline, subheadline: heroSub, ctaText: heroCtaText, ctaUrl: heroCtaUrl } },
            { type: 'about', title: 'About', sort_order: 10, content: { text: aboutText } },
            { type: 'links', title: 'Links', sort_order: 20, content: { links: parseLinks(linksText) } },
          ],
        }),
      })
      const j2 = await res2.json().catch(() => null)
      if (!res2.ok) throw new Error(j2?.error?.message || 'Failed to update pages.')

      setPages(j2?.data?.pages ?? [])
      setCompany(j1?.data?.company ?? null)
      setStatus('Saved.')
    } catch (e: any) {
      setError(e?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-400">Loading…</div>
  if (error) return <div className="text-red-200">{error}</div>
  if (!company) return <div className="text-gray-400">Not found.</div>

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <Link href="/dashboard/companies" className="text-sm text-gray-300 hover:text-red-400">
          ← Back
        </Link>
        <Link href={`/companies/${company.slug}`} className="text-sm text-gray-300 hover:text-red-400">
          View public page
        </Link>
      </div>

      <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Company</h2>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Bio</label>
          <textarea value={bio} onChange={e => setBio(e.target.value)} className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Website URL</label>
            <input value={websiteUrl} onChange={e => setWebsiteUrl(e.target.value)} className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
          </div>
          <div className="space-y-2">
            <label className="text-sm text-gray-300">Logo URL</label>
            <input value={logoUrl} onChange={e => setLogoUrl(e.target.value)} className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Theme (JSON)</label>
          <textarea
            value={themeJson}
            onChange={e => setThemeJson(e.target.value)}
            placeholder='{"primary":"#ff0000"}'
            className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm font-mono"
          />
        </div>
      </div>

      <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-4">
        <h2 className="text-lg font-semibold">Pages</h2>

        <div className="space-y-2">
          <h3 className="font-semibold">Hero</h3>
          <input value={heroHeadline} onChange={e => setHeroHeadline(e.target.value)} placeholder="Headline" className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
          <input value={heroSub} onChange={e => setHeroSub(e.target.value)} placeholder="Subheadline" className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input value={heroCtaText} onChange={e => setHeroCtaText(e.target.value)} placeholder="CTA text" className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
            <input value={heroCtaUrl} onChange={e => setHeroCtaUrl(e.target.value)} placeholder="CTA url" className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
          </div>
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">About</h3>
          <textarea value={aboutText} onChange={e => setAboutText(e.target.value)} className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm" />
        </div>

        <div className="space-y-2">
          <h3 className="font-semibold">Links</h3>
          <p className="text-xs text-gray-500">One per line: label|url</p>
          <textarea value={linksText} onChange={e => setLinksText(e.target.value)} className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm font-mono" />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-400">{status || ''}</p>
        <button
          onClick={saveAll}
          disabled={saving || !name.trim()}
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

