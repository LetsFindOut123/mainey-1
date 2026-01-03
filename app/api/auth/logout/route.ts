import { cookies } from 'next/headers'
import { jsonOk } from '@/app/api/_utils'

const ACCESS_COOKIE = 'mainey_access_token'
const REFRESH_COOKIE = 'mainey_refresh_token'

export async function POST() {
  const jar = await cookies()
  jar.set(ACCESS_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  jar.set(REFRESH_COOKIE, '', { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 0 })
  return jsonOk({ message: 'Logged out' })
}

