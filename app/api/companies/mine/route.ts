import { cookies } from 'next/headers'
import { jsonError, jsonOk } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

export async function GET(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const url = new URL(req.url)
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = clamp(Number(limitRaw || 10), 1, 50)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  let q = supabase
    .from('companies')
    .select('id, owner_id, name, slug, bio, website_url, logo_url, theme, created_at')
    .eq('owner_id', userId)
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
      ownerId: r.owner_id,
      name: r.name,
      slug: r.slug,
      bio: r.bio ?? null,
      websiteUrl: r.website_url ?? null,
      logoUrl: r.logo_url ?? null,
      theme: r.theme ?? null,
      createdAt: r.created_at,
    })),
    pageInfo: {
      nextCursor,
      hasMore: rows.length === limit,
    },
  })
}

