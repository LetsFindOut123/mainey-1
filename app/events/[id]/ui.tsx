'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Event = {
  id: string
  ownerId: string
  title: string
  description: string
  location: string | null
  startsAt: string | null
  endsAt: string | null
  lat?: number | null
  lng?: number | null
  createdAt: string
}

type ViewerRsvp = { status: 'going' | 'interested' | 'not_going'; createdAt: string } | null

const STATUSES: Array<'going' | 'interested' | 'not_going'> = ['going', 'interested', 'not_going']

export function EventDetailClient() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [event, setEvent] = useState<Event | null>(null)
  const [viewerRsvp, setViewerRsvp] = useState<ViewerRsvp>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [authed, setAuthed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const isOwner = useMemo(() => !!event && !!userId && event.ownerId === userId, [event, userId])

  // RSVP
  const [rsvpStatus, setRsvpStatus] = useState<'going' | 'interested' | 'not_going'>('going')
  const [rsvpMsg, setRsvpMsg] = useState<string | null>(null)
  const [rsvping, setRsvping] = useState(false)

  // Edit
  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStartsAt, setEditStartsAt] = useState('')
  const [editEndsAt, setEditEndsAt] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      const res = await fetch('/api/auth/me')
      const json = await res.json().catch(() => null)
      if (!alive) return
      setAuthed(res.ok)
      setUserId(json?.data?.user?.id ?? null)
    })()
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    let alive = true
    if (!id) return
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/events/${id}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load event.')
        const ev = json?.data?.event as Event
        const vr = (json?.data?.viewerRsvp ?? null) as ViewerRsvp
        if (!alive) return
        setEvent(ev)
        setViewerRsvp(vr)
        if (vr?.status) setRsvpStatus(vr.status)
        setEditTitle(ev.title)
        setEditDescription(ev.description)
        setEditLocation(ev.location ?? '')
        setEditStartsAt(ev.startsAt ?? '')
        setEditEndsAt(ev.endsAt ?? '')
        setEditLat(ev.lat !== undefined && ev.lat !== null ? String(ev.lat) : '')
        setEditLng(ev.lng !== undefined && ev.lng !== null ? String(ev.lng) : '')
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Failed to load event.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  async function rsvp() {
    if (!id) return
    setRsvping(true)
    setRsvpMsg(null)
    setError(null)
    try {
      const res = await fetch('/api/events/rsvp', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ event_id: id, status: rsvpStatus }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to RSVP.')
      setViewerRsvp({ status: json?.data?.rsvp?.status, createdAt: json?.data?.rsvp?.createdAt } as any)
      setRsvpMsg('RSVP saved.')
    } catch (e: any) {
      setError(e?.message || 'Failed to RSVP.')
    } finally {
      setRsvping(false)
    }
  }

  async function save() {
    if (!id) return
    setSaving(true)
    setSaveMsg(null)
    setError(null)
    try {
      const res = await fetch(`/api/events/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          location: editLocation.trim() || null,
          starts_at: editStartsAt.trim() || null,
          ends_at: editEndsAt.trim() || null,
          lat: editLat.trim() ? Number(editLat) : null,
          lng: editLng.trim() ? Number(editLng) : null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to save.')
      setEvent(json?.data?.event as Event)
      setSaveMsg('Saved.')
    } catch (e: any) {
      setError(e?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-400">Loading…</div>
  if (error) return <div className="text-red-200">{error}</div>
  if (!event) return <div className="text-gray-400">Not found.</div>

  return (
    <div className="space-y-6">
      <Link href="/events" className="text-sm text-gray-300 hover:text-red-400">
        ← Back to events
      </Link>

      <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-2">
        <h1 className="text-2xl font-semibold">{event.title}</h1>
        {event.location ? <p className="text-sm text-gray-400">{event.location}</p> : null}
        {event.startsAt ? <p className="text-sm text-gray-400">Starts: {event.startsAt}</p> : null}
        {event.endsAt ? <p className="text-sm text-gray-400">Ends: {event.endsAt}</p> : null}
        <p className="text-xs text-gray-500">Posted: {new Date(event.createdAt).toLocaleString()}</p>
        <p className="pt-2 whitespace-pre-wrap text-gray-200">{event.description}</p>
      </div>

      {authed ? (
        isOwner ? (
          <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Edit event</h2>
            <input
              value={editTitle}
              onChange={e => setEditTitle(e.target.value)}
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <textarea
              value={editDescription}
              onChange={e => setEditDescription(e.target.value)}
              className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                value={editLocation}
                onChange={e => setEditLocation(e.target.value)}
                placeholder="Location (optional)"
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              />
              <input
                value={editStartsAt}
                onChange={e => setEditStartsAt(e.target.value)}
                placeholder="Starts at (ISO, optional)"
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              />
              <input
                value={editEndsAt}
                onChange={e => setEditEndsAt(e.target.value)}
                placeholder="Ends at (ISO, optional)"
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm md:col-span-2"
              />
              <input
                value={editLat}
                onChange={e => setEditLat(e.target.value)}
                placeholder="Latitude (optional)"
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              />
              <input
                value={editLng}
                onChange={e => setEditLng(e.target.value)}
                placeholder="Longitude (optional)"
                className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              />
            </div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{saveMsg || ''}</p>
              <button
                onClick={save}
                disabled={saving || !editTitle.trim() || !editDescription.trim()}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
            <h2 className="text-lg font-semibold">RSVP</h2>
            {viewerRsvp ? (
              <p className="text-sm text-gray-300">
                Your RSVP: <span className="font-semibold">{viewerRsvp.status}</span>
              </p>
            ) : null}
            <select
              value={rsvpStatus}
              onChange={e => setRsvpStatus(e.target.value as any)}
              className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            >
              {STATUSES.map(s => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{rsvpMsg || ''}</p>
              <button
                onClick={rsvp}
                disabled={rsvping}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {rsvping ? 'Saving…' : 'Save RSVP'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Log in to RSVP or edit.</p>
          <Link
            href={`/login?next=${encodeURIComponent(`/events/${event.id}`)}`}
            className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm"
          >
            Login
          </Link>
        </div>
      )}
    </div>
  )
}

