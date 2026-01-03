import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

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
    .from('events')
    .select('id, owner_id, title, description, location, starts_at, ends_at, created_at')
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
      title: r.title,
      description: r.description,
      location: r.location ?? null,
      startsAt: r.starts_at ?? null,
      endsAt: r.ends_at ?? null,
      createdAt: r.created_at,
    })),
    pageInfo: {
      nextCursor,
      hasMore: rows.length === limit,
    },
  })
}

type CreateEventBody = {
  title?: string
  description?: string
  location?: string | null
  starts_at?: string | null
  ends_at?: string | null
}

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<CreateEventBody>(req)
  const title = (body?.title || '').trim()
  const description = (body?.description || '').trim()
  const location = body?.location ?? null
  const startsAt = body?.starts_at ?? null
  const endsAt = body?.ends_at ?? null

  if (!title || !description) return jsonError('bad_request', 'title and description are required', 400)
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return jsonError('bad_request', 'ends_at must be >= starts_at', 400)
  }

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('events')
    .insert({
      owner_id: userId,
      title,
      description,
      location,
      starts_at: startsAt,
      ends_at: endsAt,
    })
    .select('id, owner_id, title, description, location, starts_at, ends_at, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to create event', 500)

  return jsonOk({
    event: {
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      description: data.description,
      location: data.location ?? null,
      startsAt: data.starts_at ?? null,
      endsAt: data.ends_at ?? null,
      createdAt: data.created_at,
    },
  })
}

