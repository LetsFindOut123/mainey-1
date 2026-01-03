import { jsonError, jsonOk, readJson } from '@/app/api/_utils'
import { getSupabaseAnonClient } from '@/app/api/_supabase'

type Body = { email?: string; password?: string }

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

  const { error } = await supabase.auth.signUp({ email, password })
  if (error) return jsonError('bad_request', error.message, 400)

  // v1.1 flow: signup → login → dashboard
  return jsonOk({ message: 'Signup successful. Please log in to continue.' })
}

