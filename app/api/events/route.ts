import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getSupabaseServiceClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

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
    .select('id, owner_id, title, description, location, starts_at, ends_at, lat, lng, created_at')
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
      lat: (r as any).lat ?? null,
      lng: (r as any).lng ?? null,
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
  lat?: number | null
  lng?: number | null
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
  const lat = typeof body?.lat === 'number' ? body?.lat : null
  const lng = typeof body?.lng === 'number' ? body?.lng : null

  if (!title || !description) return jsonError('bad_request', 'title and description are required', 400)
  if (startsAt && endsAt && new Date(endsAt).getTime() < new Date(startsAt).getTime()) {
    return jsonError('bad_request', 'ends_at must be >= starts_at', 400)
  }
  if ((lat === null) !== (lng === null)) return jsonError('bad_request', 'lat and lng must be provided together', 400)
  if (lat !== null && (lat < -90 || lat > 90)) return jsonError('bad_request', 'lat must be between -90 and 90', 400)
  if (lng !== null && (lng < -180 || lng > 180)) return jsonError('bad_request', 'lng must be between -180 and 180', 400)

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
      lat,
      lng,
    })
    .select('id, owner_id, title, description, location, starts_at, ends_at, lat, lng, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to create event', 500)

  // Map pin sync (server-managed)
  if (lat !== null && lng !== null) {
    try {
      const svc = getSupabaseServiceClient()
      await svc.from('map_pins').upsert(
        {
          type: 'event',
          ref_id: data.id,
          title: data.title,
          description: data.description,
          lat,
          lng,
          starts_at: data.starts_at,
          ends_at: data.ends_at,
        },
        { onConflict: 'type,ref_id' }
      )
    } catch {
      // ignore
    }
  }

  return jsonOk({
    event: {
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      description: data.description,
      location: data.location ?? null,
      startsAt: data.starts_at ?? null,
      endsAt: data.ends_at ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      createdAt: data.created_at,
    },
  })
}

