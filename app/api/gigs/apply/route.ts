import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient, getUserIdFromAccessToken } from '@/app/api/_supabase'

type Body = { gig_id?: string; note?: string | null }

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get('mainey_access_token')?.value || getAuthTokenFromRequest(req, 'mainey_access_token')
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const userId = await getUserIdFromAccessToken(token)
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const body = await readJson<Body>(req)
  const gigId = (body?.gig_id || '').trim()
  const note = typeof body?.note === 'string' ? body?.note.trim() : null
  if (!gigId) return jsonError('bad_request', 'gig_id is required', 400)

  let anon
  try {
    anon = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const gig = await anon.from('gigs').select('id, owner_id').eq('id', gigId).maybeSingle()
  if (gig.error) return jsonError('internal', gig.error.message, 500)
  if (!gig.data) return jsonError('not_found', 'Gig not found', 404)
  if (gig.data.owner_id === userId) return jsonError('bad_request', 'You cannot apply to your own gig', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase
    .from('gig_applications')
    .insert({ gig_id: gigId, user_id: userId, note })
    .select('id, gig_id, user_id, note, created_at')
    .single()

  if (error) {
    if ((error as any).code === '23505') {
      return jsonError('bad_request', 'You have already applied to this gig', 400)
    }
    return jsonError('internal', error.message, 500)
  }

  return jsonOk({
    application: {
      id: data.id,
      gigId: data.gig_id,
      userId: data.user_id,
      note: data.note ?? null,
      createdAt: data.created_at,
    },
  })
}

