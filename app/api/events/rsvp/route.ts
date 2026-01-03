import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

const ALLOWED = new Set(['going', 'interested', 'not_going'])

type Body = { event_id?: string; status?: 'going' | 'interested' | 'not_going' }

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<Body>(req)
  const eventId = (body?.event_id || '').trim()
  const status = body?.status
  if (!eventId) return jsonError('bad_request', 'event_id is required', 400)
  if (!status || !ALLOWED.has(status)) return jsonError('bad_request', 'status must be one of going|interested|not_going', 400)

  let anon
  try {
    anon = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const ev = await anon.from('events').select('id, owner_id').eq('id', eventId).maybeSingle()
  if (ev.error) return jsonError('internal', ev.error.message, 500)
  if (!ev.data) return jsonError('not_found', 'Event not found', 404)
  if (ev.data.owner_id === userId) return jsonError('bad_request', 'You cannot RSVP to your own event', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('event_rsvps')
    .upsert(
      {
        event_id: eventId,
        user_id: userId,
        status,
      },
      { onConflict: 'event_id,user_id' }
    )
    .select('id, event_id, user_id, status, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to RSVP', 500)

  return jsonOk({
    rsvp: {
      id: data.id,
      eventId: data.event_id,
      userId: data.user_id,
      status: data.status,
      createdAt: data.created_at,
    },
  })
}

