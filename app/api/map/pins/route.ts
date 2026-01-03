import { jsonError, jsonOk } from '@/app/api/_utils'
import { getSupabaseAnonClient } from '@/app/api/_supabase'

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n))
}

const ALLOWED_TYPES = new Set(['event', 'gig', 'venue', 'memory'])

export async function GET(req: Request) {
  const url = new URL(req.url)
  const typesCsv = url.searchParams.get('types')
  const limitRaw = url.searchParams.get('limit')
  const cursor = url.searchParams.get('cursor')
  const limit = clamp(Number(limitRaw || 10), 1, 50)

  let types: string[] | null = null
  if (typesCsv) {
    types = typesCsv
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
    if (types.some(t => !ALLOWED_TYPES.has(t))) {
      return jsonError('bad_request', 'types must be a csv subset of event,gig,venue,memory', 400)
    }
  }

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  let q = supabase
    .from('map_pins')
    .select('id, type, ref_id, title, description, lat, lng, starts_at, ends_at, image_url, owner_id, created_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (types && types.length) q = q.in('type', types)
  if (cursor) q = q.lt('created_at', cursor)

  const { data, error } = await q
  if (error) return jsonError('internal', error.message, 500)

  const rows = data ?? []
  const nextCursor = rows.length ? rows[rows.length - 1].created_at : null

  return jsonOk({
    items: rows.map(r => ({
      id: r.id,
      type: r.type,
      refId: r.ref_id ?? null,
      title: r.title,
      description: r.description ?? null,
      lat: r.lat,
      lng: r.lng,
      startsAt: r.starts_at ?? null,
      endsAt: r.ends_at ?? null,
      imageUrl: r.image_url ?? null,
      ownerId: r.owner_id ?? null,
      createdAt: r.created_at,
    })),
    pageInfo: {
      nextCursor,
      hasMore: rows.length === limit,
    },
  })
}

