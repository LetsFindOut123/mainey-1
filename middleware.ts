import { NextResponse, type NextRequest } from 'next/server'

const ACCESS_COOKIE = 'mainey_access_token'

function isProtectedPath(pathname: string) {
  return pathname.startsWith('/dashboard') || pathname.startsWith('/profile') || pathname.startsWith('/messages')
}

function isAuthPage(pathname: string) {
  return pathname === '/login' || pathname === '/signup'
}

async function isTokenValid(token: string): Promise<boolean> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !supabaseAnon) {
    // In environments without config, fall back to presence-only checks.
    return true
  }

  try {
    const res = await fetch(`${supabaseUrl.replace(/\/$/, '')}/auth/v1/user`, {
      headers: {
        apikey: supabaseAnon,
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store',
    })
    return res.ok
  } catch {
    // If the auth server is unreachable, avoid locking users out.
    return true
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl
  const token = req.cookies.get(ACCESS_COOKIE)?.value

  if (isAuthPage(pathname)) {
    if (token && (await isTokenValid(token))) {
      const url = req.nextUrl.clone()
      url.pathname = '/dashboard'
      url.search = ''
      return NextResponse.redirect(url)
    }
    return NextResponse.next()
  }

  if (isProtectedPath(pathname)) {
    if (!token || !(await isTokenValid(token))) {
      const url = req.nextUrl.clone()
      url.pathname = '/login'
      url.searchParams.set('next', pathname)
      return NextResponse.redirect(url)
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/messages/:path*', '/login', '/signup'],
}

