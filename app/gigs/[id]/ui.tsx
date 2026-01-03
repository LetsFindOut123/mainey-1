'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'

type Gig = {
  id: string
  ownerId: string
  title: string
  description: string
  location: string | null
  startsAt: string | null
  lat?: number | null
  lng?: number | null
  createdAt: string
}

export function GigDetailClient() {
  const params = useParams<{ id: string }>()
  const id = params?.id

  const [gig, setGig] = useState<Gig | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [authed, setAuthed] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  const isOwner = useMemo(() => !!gig && !!userId && gig.ownerId === userId, [gig, userId])

  // Forms
  const [applyNote, setApplyNote] = useState('')
  const [applyStatus, setApplyStatus] = useState<string | null>(null)
  const [applying, setApplying] = useState(false)

  const [editTitle, setEditTitle] = useState('')
  const [editDescription, setEditDescription] = useState('')
  const [editLocation, setEditLocation] = useState('')
  const [editStartsAt, setEditStartsAt] = useState('')
  const [editLat, setEditLat] = useState('')
  const [editLng, setEditLng] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveStatus, setSaveStatus] = useState<string | null>(null)

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
        const res = await fetch(`/api/gigs/${id}`)
        const json = await res.json().catch(() => null)
        if (!res.ok) throw new Error(json?.error?.message || 'Failed to load gig.')
        const g = json?.data?.gig as Gig
        if (!alive) return
        setGig(g)
        setEditTitle(g.title)
        setEditDescription(g.description)
        setEditLocation(g.location ?? '')
        setEditStartsAt(g.startsAt ?? '')
        setEditLat(g.lat !== undefined && g.lat !== null ? String(g.lat) : '')
        setEditLng(g.lng !== undefined && g.lng !== null ? String(g.lng) : '')
      } catch (e: any) {
        if (!alive) return
        setError(e?.message || 'Failed to load gig.')
      } finally {
        if (alive) setLoading(false)
      }
    })()
    return () => {
      alive = false
    }
  }, [id])

  async function apply() {
    if (!id) return
    setApplying(true)
    setApplyStatus(null)
    setError(null)
    try {
      const res = await fetch('/api/gigs/apply', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ gig_id: id, note: applyNote.trim() || null }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to apply.')
      setApplyNote('')
      setApplyStatus('Application submitted.')
    } catch (e: any) {
      setError(e?.message || 'Failed to apply.')
    } finally {
      setApplying(false)
    }
  }

  async function save() {
    if (!id) return
    setSaving(true)
    setSaveStatus(null)
    setError(null)
    try {
      const res = await fetch(`/api/gigs/${id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: editTitle.trim(),
          description: editDescription.trim(),
          location: editLocation.trim() || null,
          starts_at: editStartsAt.trim() || null,
          lat: editLat.trim() ? Number(editLat) : null,
          lng: editLng.trim() ? Number(editLng) : null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to save.')
      const g = json?.data?.gig as Gig
      setGig(g)
      setSaveStatus('Saved.')
    } catch (e: any) {
      setError(e?.message || 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <div className="text-gray-400">Loading…</div>
  if (error) return <div className="text-red-200">{error}</div>
  if (!gig) return <div className="text-gray-400">Not found.</div>

  return (
    <div className="space-y-6">
      <Link href="/gigs" className="text-sm text-gray-300 hover:text-red-400">
        ← Back to gigs
      </Link>

      <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-2">
        <h1 className="text-2xl font-semibold">{gig.title}</h1>
        {gig.location ? <p className="text-sm text-gray-400">{gig.location}</p> : null}
        {gig.startsAt ? <p className="text-sm text-gray-400">Starts: {gig.startsAt}</p> : null}
        <p className="text-xs text-gray-500">Posted: {new Date(gig.createdAt).toLocaleString()}</p>
        <p className="pt-2 whitespace-pre-wrap text-gray-200">{gig.description}</p>
      </div>

      {authed ? (
        isOwner ? (
          <div className="rounded border border-gray-800 bg-black/30 p-4 space-y-3">
            <h2 className="text-lg font-semibold">Edit gig</h2>
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
              <p className="text-xs text-gray-400">{saveStatus || ''}</p>
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
            <h2 className="text-lg font-semibold">Apply</h2>
            <textarea
              value={applyNote}
              onChange={e => setApplyNote(e.target.value)}
              placeholder="Note (optional)"
              className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{applyStatus || ''}</p>
              <button
                onClick={apply}
                disabled={applying}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {applying ? 'Applying…' : 'Submit application'}
              </button>
            </div>
          </div>
        )
      ) : (
        <div className="rounded border border-gray-800 bg-black/30 p-4 flex items-center justify-between gap-3">
          <p className="text-sm text-gray-300">Log in to apply or edit.</p>
          <Link href={`/login?next=${encodeURIComponent(`/gigs/${gig.id}`)}`} className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
            Login
          </Link>
        </div>
      )}
    </div>
  )
}

