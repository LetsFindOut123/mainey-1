import { cookies } from 'next/headers'
import { jsonError, jsonOk } from '@/app/api/_utils'
import { getAuthTokenFromRequest, getSupabaseAnonClient } from '@/app/api/_supabase'

const ACCESS_COOKIE = 'mainey_access_token'

export async function GET(req: Request) {
  const jar = await cookies()
  const token = jar.get(ACCESS_COOKIE)?.value || getAuthTokenFromRequest(req, ACCESS_COOKIE)
  if (!token) return jsonError('unauthorized', 'Not signed in', 401)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data.user) return jsonError('unauthorized', 'Invalid session', 401)

  return jsonOk({ user: { id: data.user.id, email: data.user.email ?? null } })
}

