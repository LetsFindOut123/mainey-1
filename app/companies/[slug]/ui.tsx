'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

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
  createdAt: string
}

export function CompanySiteClient() {
  const params = useParams<{ slug: string }>()
  const slug = params?.slug

  const [company, setCompany] = useState<Company | null>(null)
  const [pages, setPages] = useState<CompanyPage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

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
        setCompany(json?.data?.company ?? null)
        setPages((json?.data?.pages ?? []).map((p: any) => ({ ...p, sortOrder: p.sortOrder ?? 0 })))
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
  }, [slug])

  const sorted = useMemo(() => [...pages].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0)), [pages])

  if (loading) return <div className="text-gray-400">Loading…</div>
  if (error) return <div className="text-red-200">{error}</div>
  if (!company) return <div className="text-gray-400">Not found.</div>

  return (
    <div className="space-y-6">
      <Link href="/companies" className="text-sm text-gray-300 hover:text-red-400">
        ← Back to companies
      </Link>

      <div className="rounded border border-gray-800 bg-black/30 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-3xl font-semibold">{company.name}</h1>
            <p className="text-xs text-gray-500">/{company.slug}</p>
            {company.websiteUrl ? (
              <a href={company.websiteUrl} className="text-sm text-red-400 hover:text-red-300" target="_blank" rel="noreferrer">
                {company.websiteUrl}
              </a>
            ) : null}
          </div>
          {company.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logoUrl} alt={`${company.name} logo`} className="w-16 h-16 rounded bg-gray-900 object-cover" />
          ) : null}
        </div>
        {company.bio ? <p className="mt-4 text-gray-200 whitespace-pre-wrap">{company.bio}</p> : null}
      </div>

      {sorted.map(p => {
        if (p.type === 'hero') {
          const headline = p.content?.headline || company.name
          const sub = p.content?.subheadline || ''
          const ctaText = p.content?.ctaText || ''
          const ctaUrl = p.content?.ctaUrl || ''
          return (
            <section key={p.id} className="rounded border border-gray-800 bg-black/30 p-4 space-y-2">
              <h2 className="text-xl font-semibold">{headline}</h2>
              {sub ? <p className="text-gray-300">{sub}</p> : null}
              {ctaText && ctaUrl ? (
                <a href={ctaUrl} className="inline-block px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-sm">
                  {ctaText}
                </a>
              ) : null}
            </section>
          )
        }

        if (p.type === 'about') {
          const text = p.content?.text || company.bio || ''
          if (!text) return null
          return (
            <section key={p.id} className="rounded border border-gray-800 bg-black/30 p-4 space-y-2">
              <h2 className="text-xl font-semibold">{p.title || 'About'}</h2>
              <p className="text-gray-200 whitespace-pre-wrap">{text}</p>
            </section>
          )
        }

        if (p.type === 'links') {
          const links = Array.isArray(p.content?.links) ? p.content.links : []
          if (!links.length) return null
          return (
            <section key={p.id} className="rounded border border-gray-800 bg-black/30 p-4 space-y-2">
              <h2 className="text-xl font-semibold">{p.title || 'Links'}</h2>
              <ul className="space-y-2">
                {links.map((l: any, idx: number) => (
                  <li key={idx}>
                    <a href={l.url} className="text-red-400 hover:text-red-300 text-sm" target="_blank" rel="noreferrer">
                      {l.label || l.url}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )
        }

        return (
          <section key={p.id} className="rounded border border-gray-800 bg-black/30 p-4">
            <h2 className="text-xl font-semibold">{p.title || p.type}</h2>
            <pre className="mt-2 text-xs text-gray-300 overflow-auto">{JSON.stringify(p.content, null, 2)}</pre>
          </section>
        )
      })}
    </div>
  )
}

