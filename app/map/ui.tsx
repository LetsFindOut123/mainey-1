'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'

type PinType = 'event' | 'gig' | 'venue' | 'memory'

type Pin = {
  id: string
  type: PinType
  refId: string | null
  title: string
  description: string | null
  lat: number
  lng: number
  startsAt: string | null
  endsAt: string | null
  imageUrl: string | null
  ownerId: string | null
  createdAt: string
}

const ALL_TYPES: PinType[] = ['event', 'gig', 'venue', 'memory']
const PAGE_SIZE = 20

function hrefFor(pin: Pin): string {
  if (pin.type === 'event' && pin.refId) return `/events/${pin.refId}`
  if (pin.type === 'gig' && pin.refId) return `/gigs/${pin.refId}`
  return `/map?pin=${encodeURIComponent(pin.id)}`
}

export function MapPinsClient() {
  const [authed, setAuthed] = useState(false)
  const [pins, setPins] = useState<Pin[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selected, setSelected] = useState<Record<PinType, boolean>>({
    event: true,
    gig: true,
    venue: true,
    memory: true,
  })

  const typesCsv = useMemo(() => ALL_TYPES.filter(t => selected[t]).join(','), [selected])

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
      if (typesCsv) qs.set('types', typesCsv)
      qs.set('limit', String(PAGE_SIZE))
      if (effectiveCursor) qs.set('cursor', effectiveCursor)
      const res = await fetch(`/api/map/pins?${qs.toString()}`)
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to load pins.')

      const rows = (json?.data?.items ?? []) as Pin[]
      setPins(prev => (opts.reset ? rows : [...prev, ...rows]))
      setCursor(json?.data?.pageInfo?.nextCursor ?? null)
      setHasMore(!!json?.data?.pageInfo?.hasMore)
    } catch (e: any) {
      setError(e?.message || 'Failed to load pins.')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typesCsv])

  // Memory pin create (minimal)
  const [memTitle, setMemTitle] = useState('')
  const [memDesc, setMemDesc] = useState('')
  const [memLat, setMemLat] = useState('')
  const [memLng, setMemLng] = useState('')
  const [memImage, setMemImage] = useState('')
  const [creating, setCreating] = useState(false)

  async function createMemory() {
    setCreating(true)
    setError(null)
    try {
      const res = await fetch('/api/map/pins/memory', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: memTitle.trim(),
          description: memDesc.trim() || null,
          image_url: memImage.trim() || null,
          lat: Number(memLat),
          lng: Number(memLng),
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create memory pin.')
      setMemTitle('')
      setMemDesc('')
      setMemLat('')
      setMemLng('')
      setMemImage('')
      await fetchPage({ reset: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to create memory pin.')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
        <h2 className="text-lg font-semibold">Filters</h2>
        <div className="flex flex-wrap gap-4 text-sm">
          {ALL_TYPES.map(t => (
            <label key={t} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={selected[t]}
                onChange={e => setSelected(s => ({ ...s, [t]: e.target.checked }))}
              />
              <span className="text-gray-200">{t}</span>
            </label>
          ))}
        </div>
      </div>

      {authed ? (
        <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Create memory pin</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              value={memTitle}
              onChange={e => setMemTitle(e.target.value)}
              placeholder="Title"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm md:col-span-2"
            />
            <input
              value={memLat}
              onChange={e => setMemLat(e.target.value)}
              placeholder="Latitude"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <input
              value={memLng}
              onChange={e => setMemLng(e.target.value)}
              placeholder="Longitude"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <input
              value={memImage}
              onChange={e => setMemImage(e.target.value)}
              placeholder="Image URL (optional)"
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm md:col-span-2"
            />
            <textarea
              value={memDesc}
              onChange={e => setMemDesc(e.target.value)}
              placeholder="Description (optional)"
              className="w-full min-h-[80px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm md:col-span-2"
            />
          </div>
          <div className="flex justify-end">
            <button
              onClick={createMemory}
              disabled={creating || !memTitle.trim() || !memLat.trim() || !memLng.trim()}
              className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </div>
        </div>
      ) : (
        <div className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Log in to create memory pins.</p>
          <Link href="/login?next=%2Fmap" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
            Login
          </Link>
        </div>
      )}

      {error && (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      )}

      <div className="space-y-3">
        {pins.length === 0 && !loading ? (
          <div className="text-gray-400 text-sm">No pins yet.</div>
        ) : (
          pins.map(p => (
            <Link
              key={p.id}
              href={hrefFor(p)}
              className="block rounded border border-gray-800 bg-black/30 p-4 hover:border-gray-600"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 uppercase">{p.type}</span>
                    <h3 className="font-semibold">{p.title}</h3>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {p.lat.toFixed(5)}, {p.lng.toFixed(5)}
                  </p>
                </div>
                <p className="text-xs text-gray-500">{new Date(p.createdAt).toLocaleString()}</p>
              </div>
              {p.description ? <p className="mt-2 text-sm text-gray-200 whitespace-pre-wrap">{p.description}</p> : null}
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
        ) : pins.length ? (
          <p className="text-xs text-gray-500">You’re all caught up.</p>
        ) : null}
      </div>
    </div>
  )
}

