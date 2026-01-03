import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient } from '@/app/api/_supabase'

type Body = { body?: string }

const ACCESS_COOKIE = 'mainey_access_token'

export async function POST(req: Request) {
  const jar = await cookies()
  const token = jar.get(ACCESS_COOKIE)?.value || getAuthTokenFromRequest(req, ACCESS_COOKIE)
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  const body = await readJson<Body>(req)
  const text = (body?.body || '').trim()
  if (!text) return jsonError('bad_request', 'body is required', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient(token)
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  // Validate session/user
  const me = await getSupabaseAnonClient().auth.getUser(token)
  const userId = me.data.user?.id
  if (!userId) return jsonError('unauthorized', 'Invalid session', 401)

  const { data, error } = await supabase
    .from('feed_posts')
    .insert({ author_id: userId, body: text })
    .select('id, author_id, body, created_at')
    .single()

  if (error || !data) return jsonError('internal', error?.message || 'Failed to create post', 500)

  return jsonOk({
    post: {
      id: data.id,
      authorId: data.author_id,
      body: data.body,
      createdAt: data.created_at,
    },
  })
}

