'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'

const nav = [
  'Home','Feed','Discover','Community','Gigs','Events',
  'Calendar','Projects','Companies','Spaces','Fundraising','Marketplace'
]

export function Header() {
  const path = usePathname()
  const router = useRouter()
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    let alive = true

    async function load() {
      const { data } = await supabase.auth.getSession()
      if (!alive) return
      setAuthed(!!data.session)
    }

    load()

    const { data: sub } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setAuthed(!!session)
    })

    return () => {
      alive = false
      sub.subscription.unsubscribe()
    }
  }, [])

  async function logout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

  return (
    <header className="border-b border-gray-800 sticky top-0 bg-black/80 backdrop-blur z-50">
      <nav className="flex items-center justify-between px-6 py-3 max-w-7xl mx-auto">
        <Link href="/" className="text-2xl font-bold text-red-500">Mainey</Link>
        <ul className="hidden md:flex flex-wrap gap-5">
          {nav.map(label => {
            const href = label === 'Home' ? '/' : `/${label.toLowerCase()}`
            const active = path === href
            return (
              <li key={label}>
                <Link
                  href={href}
                  className={`${active ? 'text-red-500 font-semibold' : 'text-gray-300 hover:text-red-400'}`}
                >
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
        <div className="flex items-center gap-4">
          {authed ? (
            <>
              <Link href="/dashboard" className="text-gray-300 hover:text-red-400">Dashboard</Link>
              <Link href="/profile" className="text-gray-300 hover:text-red-400">Profile</Link>
              <button
                onClick={logout}
                className="px-3 py-1 rounded bg-gray-800 border border-gray-700 hover:border-gray-500"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <Link href="/signup" className="text-gray-300 hover:text-red-400">Sign up</Link>
              <Link href="/login" className="px-3 py-1 rounded bg-red-600 hover:bg-red-700">Login</Link>
            </>
          )}
        </div>
      </nav>
    </header>
  )
}
