import { createClient, type SupabaseClient } from '@supabase/supabase-js'

function getEnv() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!url || !anon) return null
  return { url, anon }
}

export function getSupabaseAnonClient(accessToken?: string): SupabaseClient {
  const env = getEnv()
  if (!env) {
    // Route handlers should handle this explicitly; keep constructor safe.
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
  }
  return createClient(env.url, env.anon, {
    global: accessToken ? { headers: { Authorization: `Bearer ${accessToken}` } } : undefined,
  })
}

export function getSupabaseServiceClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !service) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for server-managed operations')
  }
  return createClient(url, service, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

export function getAuthTokenFromRequest(req: Request, cookieName = 'mainey_access_token'): string | null {
  const authHeader = req.headers.get('authorization')
  if (authHeader?.toLowerCase().startsWith('bearer ')) return authHeader.slice(7)

  const cookie = req.headers.get('cookie') || ''
  const parts = cookie.split(';').map(s => s.trim())
  for (const p of parts) {
    if (!p) continue
    const [k, ...rest] = p.split('=')
    if (k === cookieName) return decodeURIComponent(rest.join('=') || '')
  }
  return null
}

export async function getUserIdFromAccessToken(token: string): Promise<string | null> {
  try {
    const supabase = getSupabaseAnonClient()
    const { data, error } = await supabase.auth.getUser(token)
    if (error) return null
    return data.user?.id ?? null
  } catch {
    return null
  }
}

