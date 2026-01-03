import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getSupabaseServiceClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return jsonError('bad_request', 'id is required', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('gigs')
    .select('id, owner_id, title, description, location, starts_at, lat, lng, created_at')
    .eq('id', id)
    .single()

  if (error) {
    if ((error as any).code === 'PGRST116') return jsonError('not_found', 'Gig not found', 404)
    return jsonError('internal', error.message, 500)
  }

  return jsonOk({
    gig: {
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      description: data.description,
      location: data.location ?? null,
      startsAt: data.starts_at ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      createdAt: data.created_at,
    },
  })
}

type PatchBody = {
  title?: string
  description?: string
  location?: string | null
  starts_at?: string | null
  lat?: number | null
  lng?: number | null
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  if (!id) return jsonError('bad_request', 'id is required', 400)

  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<PatchBody>(req)
  const patch: Record<string, any> = {}
  if (typeof body?.title === 'string') patch.title = body.title.trim()
  if (typeof body?.description === 'string') patch.description = body.description.trim()
  if (body && 'location' in body) patch.location = body.location
  if (body && 'starts_at' in body) patch.starts_at = body.starts_at
  if (body && 'lat' in body) patch.lat = body.lat
  if (body && 'lng' in body) patch.lng = body.lng

  if (Object.keys(patch).length === 0) return jsonError('bad_request', 'No fields to update', 400)

  if (('lat' in patch) !== ('lng' in patch)) return jsonError('bad_request', 'lat and lng must be provided together', 400)
  if (patch.lat !== undefined && patch.lat !== null && (patch.lat < -90 || patch.lat > 90))
    return jsonError('bad_request', 'lat must be between -90 and 90', 400)
  if (patch.lng !== undefined && patch.lng !== null && (patch.lng < -180 || patch.lng > 180))
    return jsonError('bad_request', 'lng must be between -180 and 180', 400)

  // Pre-check ownership (gigs are public anyway)
  let anon
  try {
    anon = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const existing = await anon.from('gigs').select('owner_id').eq('id', id).maybeSingle()
  if (existing.error) return jsonError('internal', existing.error.message, 500)
  if (!existing.data) return jsonError('not_found', 'Gig not found', 404)
  if (existing.data.owner_id !== userId) return jsonError('forbidden', 'Only the gig owner can edit', 403)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('gigs')
    .update(patch)
    .eq('id', id)
    .select('id, owner_id, title, description, location, starts_at, lat, lng, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to update gig', 500)

  // Map pin sync (server-managed)
  try {
    const svc = getSupabaseServiceClient()
    const lat = data.lat ?? null
    const lng = data.lng ?? null
    if (lat !== null && lng !== null) {
      await svc.from('map_pins').upsert(
        {
          type: 'gig',
          ref_id: data.id,
          title: data.title,
          description: data.description,
          lat,
          lng,
          starts_at: data.starts_at,
        },
        { onConflict: 'type,ref_id' }
      )
    } else {
      await svc.from('map_pins').delete().eq('type', 'gig').eq('ref_id', data.id)
    }
  } catch {
    // ignore
  }

  return jsonOk({
    gig: {
      id: data.id,
      ownerId: data.owner_id,
      title: data.title,
      description: data.description,
      location: data.location ?? null,
      startsAt: data.starts_at ?? null,
      lat: data.lat ?? null,
      lng: data.lng ?? null,
      createdAt: data.created_at,
    },
  })
}

