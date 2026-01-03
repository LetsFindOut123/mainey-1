'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Gig = {
  id: string
  ownerId: string
  title: string
  description: string
  location: string | null
  startsAt: string | null
  createdAt: string
}

const PAGE_SIZE = 10

export function GigsClient() {
  const [authed, setAuthed] = useState(false)
  const [posts, setPosts] = useState<Gig[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [lat, setLat] = useState('')
  const [lng, setLng] = useState('')
  const [creating, setCreating] = useState(false)

  const canCreate = useMemo(() => authed, [authed])

  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await fetch('/api/auth/me')
      if (!alive) return
      setAuthed(res.ok)
    })()
    return () => {
      alive = false
    }
  }, [])

  async function fetchPage(opts: { reset: boolean }) {
    if (loading) return
    setLoading(true)
    setError(null)
    try {
      const effectiveCursor = opts.reset ? null : cursor
      const qs = new URLSearchParams()
      qs.set('limit', String(PAGE_SIZE))
      if (effectiveCursor) qs.set('cursor', effectiveCursor)
      const res = await fetch(`/api/gigs?${qs.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load gigs.')

      const rows = (json?.data?.items ?? []) as Gig[]
      setPosts(prev => (opts.reset ? rows : [...prev, ...rows]))
      setCursor(json?.data?.pageInfo?.nextCursor ?? null)
      setHasMore(!!json?.data?.pageInfo?.hasMore)
    } catch (e: any) {
      setError(e?.message || 'Failed to load gigs.')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createGig() {
    const t = title.trim()
    const d = description.trim()
    if (!t || !d) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/gigs', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: t,
          description: d,
          location: location.trim() || null,
          starts_at: startsAt.trim() || null,
          lat: lat.trim() ? Number(lat) : null,
          lng: lng.trim() ? Number(lng) : null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create gig.')

      setTitle('')
      setDescription('')
      setLocation('')
      setStartsAt('')
      setLat('')
      setLng('')
      await fetchPage({ reset: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to create gig.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {canCreate ? (
        <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create gig</h2>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
          />
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Description"
            className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={location}
              onChange={e => setLocation(e.target.value)}
              placeholder="Location (optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <input
              value={startsAt}
              onChange={e => setStartsAt(e.target.value)}
              placeholder="Starts at (ISO, optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <input
              value={lat}
              onChange={e => setLat(e.target.value)}
              placeholder="Latitude (optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <input
              value={lng}
              onChange={e => setLng(e.target.value)}
              placeholder="Longitude (optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createGig}
              disabled={creating || !title.trim() || !description.trim()}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Log in to create a gig.</p>
          <Link href="/login?next=%2Fgigs" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
            Login
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="space-y-3">
        {posts.length === 0 && !loading ? (
          <div className="text-gray-400 text-sm">No gigs yet.</div>
        ) : (
          posts.map(g => (
            <Link
              key={g.id}
              href={`/gigs/${g.id}`}
              className="block rounded border border-gray-800 bg-black/30 p-4 hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{g.title}</h3>
                  {g.location ? <p className="text-xs text-gray-400 mt-1">{g.location}</p> : null}
                </div>
                <p className="text-xs text-gray-500">{new Date(g.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap">{g.description}</p>
              {g.startsAt ? <p className="mt-2 text-xs text-gray-500">Starts: {g.startsAt}</p> : null}
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
        ) : posts.length ? (
          <p className="text-xs text-gray-500">You’re all caught up.</p>
        ) : null}
      </div>
    </div>
  )
}

