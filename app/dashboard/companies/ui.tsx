'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'

type Company = {
  id: string
  name: string
  slug: string
  createdAt: string
}

export function DashboardCompaniesClient() {
  const [items, setItems] = useState<Company[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch('/api/companies/mine')
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load companies.')
        if (!alive) return
        setItems((json?.data?.items ?? []) as Company[])
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Failed to load companies.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-gray-300 text-sm">Create and manage your company sites.</p>
        <Link href="/dashboard/companies/new" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
          New Company
        </Link>
      </div>

      {error ? (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      {loading ? (
        <div className="text-gray-400 text-sm">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-gray-400 text-sm">No companies yet.</div>
      ) : (
        <div className="space-y-3">
          {items.map(c => (
            <div key={c.id} className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between">
              <div>
                <div className="font-semibold">{c.name}</div>
                <div className="text-xs text-gray-500">/{c.slug}</div>
              </div>
              <div className="flex items-center gap-3">
                <Link href={`/companies/${c.slug}`} className="text-sm text-gray-300 hover:text-red-400">
                  View
                </Link>
                <Link href={`/dashboard/companies/${c.slug}/edit`} className="text-sm text-red-400 hover:text-red-300">
                  Edit
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

