'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { supabase } from '@/lib/supabaseClient'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

type FeedPost = {
  id: string
  author_id: string | null
  body: string
  created_at: string
}

const PAGE_SIZE = 10

export function FeedClient() {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [authedUserId, setAuthedUserId] = useState<string | null>(null)
  const [draft, setDraft] = useState('')
  const [posting, setPosting] = useState(false)

  const canPost = useMemo(() => !!authedUserId, [authedUserId])

  useEffect(() => {
    let alive = true

    async function loadSession() {
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      setAuthedUserId(data.session?.user?.id ?? null)
    }

    loadSession()
    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAuthedUserId(session?.user?.id ?? null)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function fetchPage(opts: { reset: boolean }) {
    if (loading) return
    setLoading(true)
    setError(null)

    try {
      const effectiveCursor = opts.reset ? null : cursor
      let q = supabase
        .from('feed_posts')
        .select('id, author_id, body, created_at')
        .order('created_at', { ascending: false })
        .limit(PAGE_SIZE)

      if (effectiveCursor) q = q.lt('created_at', effectiveCursor)

      const { data, error } = await q
      if (error) throw error

      const rows = (data ?? []) as FeedPost[]
      const nextCursor = rows.length ? rows[rows.length - 1].created_at : null

      setPosts(prev => (opts.reset ? rows : [...prev, ...rows]))
      setCursor(nextCursor)
      setHasMore(rows.length === PAGE_SIZE)
    } catch (e: any) {
      setError(e?.message || 'Failed to load feed.')
      setHasMore(false)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPage({ reset: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function submitPost() {
    if (!authedUserId) return
    const body = draft.trim()
    if (!body) return

    setPosting(true)
    setError(null)

    try {
      const { error } = await supabase.from('feed_posts').insert({
        author_id: authedUserId,
        body,
      })
      if (error) throw error
      setDraft('')
      // Refresh newest posts
      await fetchPage({ reset: true })
    } catch (e: any) {
      setError(e?.message || 'Failed to post.')
    } finally {
      setPosting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded border border-gray-800 bg-black/30 p-4">
        {canPost ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={e => setDraft(e.target.value)}
              placeholder="Share an update…"
              className="w-full min-h-[96px] resize-y rounded bg-gray-900 border border-gray-700 px-3 py-2 text-sm"
              maxLength={2000}
            />
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs text-gray-400">{draft.trim().length}/2000</p>
              <button
                onClick={submitPost}
                disabled={posting || !draft.trim()}
                className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white text-sm disabled:opacity-60"
              >
                {posting ? 'Posting…' : 'Post'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-300">Log in to post to the feed.</p>
            <Link href="/login?next=%2Ffeed" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-sm">
              Login
            </Link>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded border border-red-900 bg-red-900/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      <div className="space-y-3">
        {posts.length === 0 && !loading ? (
          <div className="text-gray-400 text-sm">No posts yet.</div>
        ) : (
          posts.map(p => (
            <div key={p.id} className="rounded border border-gray-800 bg-black/30 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-gray-500">{new Date(p.created_at).toLocaleString()}</p>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-gray-200">{p.body}</p>
            </div>
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

