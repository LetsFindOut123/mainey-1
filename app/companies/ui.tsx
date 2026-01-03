'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Company = {
  id: string
  name: string
  slug: string
  bio: string | null
  websiteUrl: string | null
  logoUrl: string | null
  createdAt: string
}

const PAGE_SIZE = 10

export function CompaniesClient() {
  const [items, setItems] = useState<Company[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchPage(opts: { reset: boolean }) {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const effectiveCursor = opts.reset ? null : cursor
      const qs = new URLSearchParams()
      qs.set('limit', String(PAGE_SIZE))
      if (effectiveCursor) qs.set('cursor', effectiveCursor)
      const res = await fetch(`/api/companies?${qs.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load companies.')
      const rows = (json?.data?.items ?? []) as any[]
      setItems(prev => (opts.reset ? rows : [...prev, ...rows]))
      setCursor(json?.data?.pageInfo?.nextCursor ?? null)
      setHasMore(!!json?.data?.pageInfo?.hasMore)
    } catch (e: any) {
      setError(e?.message || 'Failed to load companies.')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="space-y-4">
      {error ? (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="space-y-3">
        {items.length === 0 && !loading ? (
          <div className="text-gray-400 text-sm">No companies yet.</div>
        ) : (
          items.map(c => (
            <Link
              key={c.id}
              href={`/companies/${c.slug}`}
              className="block rounded border border-gray-800 bg-black/30 p-4 hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <h3 className="font-semibold">{c.name}</h3>
                  <p className="text-xs text-gray-500">/{c.slug}</p>
                </div>
                <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString()}</p>
              </div>
              {c.bio ? <p className="mt-2 text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap">{c.bio}</p> : null}
            </Link>
          ))
        )}
      </div>

      <div className="flex items-center justify-center">
        {hasMore ? (
          <button
            onClick={() => fetchPage({ reset: false })}
            disabled={loading}
            className="px-4 py-2 rounded bg-gray-900 border border-gray-700 hover:border-gray-500 text-sm disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Load more'}
          </button>
        ) : items.length ? (
          <p className="text-xs text-gray-500">You’re all caught up.</p>
        ) : null}
      </div>
    </div>
  )
}

