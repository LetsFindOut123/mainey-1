'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type Event = {
  id: string
  ownerId: string
  title: string
  description: string
  location: string | null
  startsAt: string | null
  endsAt: string | null
  createdAt: string
}

const PAGE_SIZE = 10

export function EventsClient() {
  const [authed, setAuthed] = useState(false)
  const [items, setItems] = useState<Event[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
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
      const res = await fetch(`/api/events?${qs.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load events.')

      const rows = (json?.data?.items ?? []) as Event[]
      setItems(prev => (opts.reset ? rows : [...prev, ...rows]))
      setCursor(json?.data?.pageInfo?.nextCursor ?? null)
      setHasMore(!!json?.data?.pageInfo?.hasMore)
    } catch (e: any) {
      setError(e?.message || 'Failed to load events.')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function createEvent() {
    const t = title.trim()
    const d = description.trim()
    if (!t || !d) return

    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: t,
          description: d,
          location: location.trim() || null,
          starts_at: startsAt.trim() || null,
          ends_at: endsAt.trim() || null,
          lat: lat.trim() ? Number(lat) : null,
          lng: lng.trim() ? Number(lng) : null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create event.')

      setTitle('')
      setDescription('')
      setLocation('')
      setStartsAt('')
      setEndsAt('')
      setLat('')
      setLng('')
      await fetchPage({ reset: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to create event.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      {canCreate ? (
        <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create event</h2>
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
              value={endsAt}
              onChange={e => setEndsAt(e.target.value)}
              placeholder="Ends at (ISO, optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm md:col-span-2"
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
              onClick={createEvent}
              disabled={creating || !title.trim() || !description.trim()}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Log in to create an event.</p>
          <Link href="/login?next=%2Fevents" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
            Login
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="space-y-3">
        {items.length === 0 && !loading ? (
          <div className="text-gray-400 text-sm">No events yet.</div>
        ) : (
          items.map(ev => (
            <Link
              key={ev.id}
              href={`/events/${ev.id}`}
              className="block rounded border border-gray-800 bg-black/30 p-4 hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold">{ev.title}</h3>
                  {ev.location ? <p className="text-xs text-gray-400 mt-1">{ev.location}</p> : null}
                </div>
                <p className="text-xs text-gray-500">{new Date(ev.createdAt).toLocaleString()}</p>
              </div>
              <p className="mt-2 text-sm text-gray-200 line-clamp-3 whitespace-pre-wrap">{ev.description}</p>
              {ev.startsAt ? <p className="mt-2 text-xs text-gray-500">Starts: {ev.startsAt}</p> : null}
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

