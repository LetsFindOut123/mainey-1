import { cookies } from 'next/headers'
import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getSupabaseAnonClient } from '@/app/api/_supabase'

type Body = { email?: string; password?: string }

const ACCESS_COOKIE = 'mainey_access_token'
const REFRESH_COOKIE = 'mainey_refresh_token'

export async function POST(req: Request) {
  const body = await readJson<Body>(req)
  const email = (body?.email || '').trim()
  const password = body?.password || ''
  if (!email || !password) return jsonError('bad_request', 'email and password are required', 400)

  let supabase
  try {
    supabase = getSupabaseAnonClient()
  } catch (e: any) {
    return jsonError('internal', e?.message || 'Supabase is not configured', 500)
  }

  const { data, error } = await supabase.auth.signInWithPassword({ email, password })
  if (error || !data.session) return jsonError('unauthorized', error?.message || 'Login failed', 401)

  const jar = await cookies()
  const secure = process.env.NODE_ENV === 'production'
  jar.set(ACCESS_COOKIE, data.session.access_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  })
  jar.set(REFRESH_COOKIE, data.session.refresh_token, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: '/',
  })

  return jsonOk({
    user: {
      id: data.user?.id,
      email: data.user?.email ?? null,
    },
  })
}

