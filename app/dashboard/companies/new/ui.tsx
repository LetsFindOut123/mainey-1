'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

export function NewCompanyClient() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [bio, setBio] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [logoUrl, setLogoUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function create() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/companies', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          bio: bio.trim() || null,
          website_url: websiteUrl.trim() || null,
          logo_url: logoUrl.trim() || null,
        }),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) throw new Error(json?.error?.message || 'Failed to create company.')
      const createdSlug = json?.data?.company?.slug
      router.replace(`/dashboard/companies/${createdSlug}/edit`)
    } catch (e: any) {
      setError(e?.message || 'Failed to create company.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4 max-w-2xl">
      {error ? (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">{error}</div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm text-gray-300">Name</label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
          placeholder="Acme Studios"
        />
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-300">Slug (lowercase, a-z0-9-)</label>
        <input
          value={slug}
          onChange={e => setSlug(e.target.value)}
          className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
          placeholder="acme-studios"
        />
        <p className="text-xs text-gray-500">Public page will be: /companies/&lt;slug&gt;</p>
      </div>

      <div className="space-y-2">
        <label className="text-sm text-gray-300">Bio</label>
        <textarea
          value={bio}
          onChange={e => setBio(e.target.value)}
          className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
          placeholder="What you do…"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Website URL</label>
          <input
            value={websiteUrl}
            onChange={e => setWebsiteUrl(e.target.value)}
            className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            placeholder="https://example.com"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm text-gray-300">Logo URL</label>
          <input
            value={logoUrl}
            onChange={e => setLogoUrl(e.target.value)}
            className="w-full rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
            placeholder="https://…/logo.png"
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          onClick={create}
          disabled={saving || !name.trim() || !slug.trim()}
          className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
        >
          {saving ? 'Creating…' : 'Create company'}
        </button>
      </div>
    </div>
  )
}

