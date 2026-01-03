import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

type Body = {
  title?: string
  description?: string | null
  image_url?: string | null
  lat?: number
  lng?: number
}

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<Body>(req)
  const title = (body?.title || '').trim()
  const description = typeof body?.description === 'string' ? body.description.trim() : null
  const imageUrl = typeof body?.image_url === 'string' ? body.image_url.trim() : null
  const lat = typeof body?.lat === 'number' ? body.lat : null
  const lng = typeof body?.lng === 'number' ? body.lng : null

  if (!title) return jsonError('bad_request', 'title is required', 400)
  if (lat === null || lng === null) return jsonError('bad_request', 'lat and lng are required', 400)
  if (lat < -90 || lat > 90) return jsonError('bad_request', 'lat must be between -90 and 90', 400)
  if (lng < -180 || lng > 180) return jsonError('bad_request', 'lng must be between -180 and 180', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('map_pins')
    .insert({
      type: 'memory',
      ref_id: null,
      title,
      description,
      lat,
      lng,
      image_url: imageUrl,
      owner_id: userId,
    })
    .select('id, type, ref_id, title, description, lat, lng, starts_at, ends_at, image_url, owner_id, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to create memory pin', 500)

  return jsonOk({
    pin: {
      id: data.id,
      type: data.type,
      refId: data.ref_id ?? null,
      title: data.title,
      description: data.description ?? null,
      lat: data.lat,
      lng: data.lng,
      startsAt: data.starts_at ?? null,
      endsAt: data.ends_at ?? null,
      imageUrl: data.image_url ?? null,
      ownerId: data.owner_id ?? null,
      createdAt: data.created_at,
    },
  })
}

