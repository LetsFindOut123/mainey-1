import { jsonError, jsonOk } from '@/app/api/_utils'
import { getSupabaseAnonClient } from '@/app/api/_supabase'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function GET(req: Request) {
  const url = new URL(req.url)
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = clamp(Number(limitRaw || 10), 1, 50)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  let q = supabase
    .from('feed_posts')
    .select('id, author_id, body, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (cursor) q = q.lt('created_at', cursor)

  const { data, error } = await q
  if (error) return jsonError('internal', error.message, 500)

  const rows = data ?? []
  const nextCursor = rows.length ? rows[rows.length - 1].created_at : null

  return jsonOk({
    items: rows.map(r => ({
      id: r.id,
      authorId: r.author_id,
      body: r.body,
      createdAt: r.created_at,
    })),
    pageInfo: {
      nextCursor,
      hasMore: rows.length === limit,
    },
  })
}

